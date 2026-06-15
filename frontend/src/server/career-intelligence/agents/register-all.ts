import { agentRegistry } from "../../core/agent/agent-registry";
import { createAgent } from "./agent-builder";
import type { AgentInput, AgentOutput, AgentContext } from "../../core/agent/types";
import { evaluateResponse } from "../evaluators/response-evaluator";
import { judge0Client } from "../integrations/judge0-client";
import { githubClient } from "../integrations/github-client";
import { linkedinClient } from "../integrations/linkedin-client";
import { prisma } from "../../core/db/prisma";
import { llmFromPrompt, llmPromptJson } from "../prompts/agent-llm";
import { questionPromptCategory } from "../prompts";
import { cleanPlainText } from "../prompts/json-utils";
import {
  QuestionGenerationSchema,
  AnalysisEnrichmentSchema,
  SessionEvaluationSchema,
  FeedbackSchema,
  ResumeAnalysisSchema,
  CodingProblemSchema,
  CareerRecommendationsSchema,
  LearningRoadmapSchema,
} from "../prompts/schemas";
import { pickCodingProblem } from "../knowledge/coding-problem-bank";
import { evaluateCodeHeuristic } from "../evaluators/coding-evaluator";
import { computePlacementHeuristic } from "../evaluators/career-metrics";

type Exec = (input: AgentInput, ctx: AgentContext, complete: (p: string, s?: string) => Promise<string>) => Promise<AgentOutput>;

function agent(id: string, name: string, objective: string, category: string, tools: string[], rules: string[], exec: Exec) {
  return createAgent({ id, name, objective, category, tools, evaluationRules: rules }, exec);
}

const agents = [
  // Resume Intelligence (1-5)
  agent("resume-builder", "ResumeBuilderAgent", "Build and optimize professional resumes", "resume", ["resume-store", "pdf-export"], ["completeness", "ats-keywords"], async (input, _ctx, complete) => {
    const text = await complete(`Optimize resume for ${input.targetRole}: ${JSON.stringify(input.data)}`, "You are an expert resume writer.");
    return { result: { summary: text, enhanced: true }, confidence: 0.85 };
  }),
  agent("resume-parser", "ResumeParserAgent", "Parse and structure resume documents", "resume", ["pdf-parser", "docx-parser"], ["field-extraction"], async (input) => {
    return { result: { parsed: input.rawText || input.data, fields: ["name", "email", "skills", "experience"] }, confidence: 0.8 };
  }),
  agent("resume-analysis", "ResumeAnalysisAgent", "Analyze resume quality and gaps", "resume", ["resume-store", "prompt-registry"], ["quality-score"], async (input) => {
    const data = input.data as Record<string, unknown>;
    const skills = (data.skills as string[]) || [];
    const atsScore = (input.atsScore as number) ?? Math.min(100, 40 + skills.length * 8 + (data.summary ? 15 : 0));
    const targetRole = (input.targetRole as string) || (data.targetRole as string) || "Software Engineer";

    const fallback = {
      summary: `Resume scores ${atsScore}/100 for ${targetRole}. Add more role-specific keywords and quantified achievements.`,
      strengths: skills.length >= 3 ? ["Good skill coverage"] : ["Basic structure present"],
      gaps: skills.length < 5 ? ["Expand technical skills section"] : [],
      keywordSuggestions: [targetRole, "projects", "internship"],
      atsTips: atsScore < 70 ? ["Add role-specific keywords from the job description"] : ["Maintain keyword density"],
    };

    const { data: analysis, valid, source } = await llmPromptJson(
      "resume",
      "analysis",
      {
        targetRole,
        atsScore,
        resumeData: JSON.stringify(data).slice(0, 4000),
      },
      ResumeAnalysisSchema,
      fallback
    );

    return {
      result: {
        analysis: analysis.summary,
        score: atsScore,
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        keywordSuggestions: analysis.keywordSuggestions,
        atsTips: analysis.atsTips,
        source: valid ? `llm-${source}` : "heuristic-fallback",
      },
      confidence: valid ? 0.88 : 0.75,
    };
  }),
  agent("ats-agent", "ATSAgent", "Score resume ATS compatibility", "resume", ["keyword-matcher"], ["keyword-coverage"], async (input) => {
    const data = input.data as Record<string, unknown>;
    const skills = (data.skills as string[]) || [];
    const score = Math.min(100, 40 + skills.length * 8 + (data.summary ? 15 : 0));
    return { result: { score, feedback: score < 70 ? ["Add more role-specific keywords"] : ["Strong ATS compatibility"] }, confidence: 0.9 };
  }),
  agent("skill-gap", "SkillGapAgent", "Identify skill gaps for target role", "resume", ["skill-taxonomy"], ["gap-analysis"], async (input, _ctx, complete) => {
    const text = await complete(`Identify skill gaps for ${input.targetRole} given skills: ${JSON.stringify(input.skills)}`);
    return { result: { gaps: text.split(",").map((s) => s.trim()), priority: "high" }, confidence: 0.78 };
  }),

  // Interview Intelligence (6-10)
  agent("resume-interview", "ResumeInterviewAgent", "Conduct resume-based interviews", "interview", ["question-bank", "resume-data"], ["relevance", "depth"], async (input, _ctx, complete) => {
    const text = await complete(`Generate resume-based interview question for role ${input.targetRole}. Resume: ${JSON.stringify(input.resume)}`);
    return { result: { question: text }, confidence: 0.88 };
  }),
  agent("technical-interview", "TechnicalInterviewAgent", "Conduct technical interviews", "interview", ["question-bank", "skill-taxonomy"], ["technical-depth"], async (input, _ctx, complete) => {
    const text = await complete(`Technical interview question for ${input.targetRole}, skills: ${JSON.stringify(input.skills)}. Difficulty: ${input.difficulty || "medium"}`);
    return { result: { question: text, difficulty: input.difficulty || "medium" }, confidence: 0.87 };
  }),
  agent("coding-interview", "CodingInterviewAgent", "Conduct coding interviews", "interview", ["question-bank", "judge0", "prompt-registry"], ["problem-solving"], async (input) => {
    const asked = (input.asked as string[]) || [];
    const fallback = pickCodingProblem(asked, (input.difficulty as string) || "medium");
    const { data, valid, source } = await llmPromptJson(
      "coding",
      "problem-generation",
      {
        targetRole: (input.targetRole as string) || "Software Engineer",
        difficulty: (input.difficulty as string) || "medium",
        skills: JSON.stringify(input.skills || []),
        asked: JSON.stringify(asked),
      },
      CodingProblemSchema,
      { ...fallback, starterCode: "" }
    );
    return {
      result: {
        ...data,
        question: data.description,
        language: input.language || "python",
        source: valid ? `llm-${source}` : "bank-fallback",
      },
      confidence: valid ? 0.88 : 0.78,
    };
  }),
  agent("behavioral-interview", "BehavioralInterviewAgent", "Conduct STAR-based behavioral interviews", "interview", ["question-bank"], ["star-structure"], async (input, _ctx, complete) => {
    const text = await complete(`Behavioral interview question using STAR format for ${input.targetRole}`);
    return { result: { question: text, format: "STAR" }, confidence: 0.85 };
  }),
  agent("hr-interview", "HRInterviewAgent", "Conduct HR and culture-fit interviews", "interview", ["question-bank"], ["culture-fit"], async (input, _ctx, complete) => {
    const text = await complete(`HR interview question about motivation and career goals for ${input.targetRole}`);
    return { result: { question: text }, confidence: 0.84 };
  }),

  // Evaluation Intelligence (11-14)
  agent("response-analysis", "ResponseAnalysisAgent", "Analyze candidate responses for signals (strong/weak/irrelevant/team-ownership/confidence)", "evaluation", ["nlp-analyzer", "model-gateway", "prompt-registry"], ["signal-detection", "answer-type-classification", "confidence-scoring"], async (input) => {
    const eval_ = evaluateResponse(
      input.question as string,
      input.answer as string,
      (input.keywords as string[]) || [],
      (input.type as string) || "technical"
    );

    const enrichmentFallback = {
      followUp: eval_.followUp || null,
      feedback: eval_.feedback,
      probeAreas: eval_.signals,
    };

    try {
      const { data: enriched, valid } = await llmPromptJson(
        "response",
        "analysis-enrichment",
        {
          interviewType: (input.type as string) || "technical",
          question: input.question as string,
          answer: input.answer as string,
          answerType: eval_.answerType,
          scores: JSON.stringify(eval_.scores),
          signals: JSON.stringify(eval_.signals),
          existingFollowUp: eval_.followUp || "",
        },
        AnalysisEnrichmentSchema,
        enrichmentFallback
      );

      if (valid) {
        if (enriched.followUp && enriched.followUp.length > 10) eval_.followUp = enriched.followUp;
        if (enriched.feedback) eval_.feedback = enriched.feedback;
        if (enriched.probeAreas?.length) {
          eval_.signals = [...new Set([...eval_.signals, ...enriched.probeAreas])];
        }
      }
    } catch {
      // heuristic eval_ unchanged
    }

    return { result: { ...eval_, source: "heuristic+llm-enrichment" }, confidence: eval_.confidence };
  }),
  agent("evaluation", "EvaluationAgent", "Score interview performance holistically", "evaluation", ["scoring-rubric", "prompt-registry"], ["multi-dimensional"], async (input) => {
    const answers = (input.answers as Array<{
      scores: { overall: number; relevance?: number; depth?: number; communication?: number; confidence?: number };
      question?: string;
      answerType?: string;
    }>) || [];

    const overallScore = answers.length
      ? Math.round(answers.reduce((s, a) => s + a.scores.overall, 0) / answers.length)
      : 0;

    const avg = (key: keyof typeof answers[0]["scores"]) => {
      const vals = answers.map((a) => a.scores[key]).filter((v): v is number => typeof v === "number");
      return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : overallScore;
    };

    const dimensions = {
      communication: avg("communication"),
      technical: avg("depth"),
      relevance: avg("relevance"),
      confidence: avg("confidence"),
    };

    const answerSummaries = answers.map((a, i) => ({
      q: i + 1,
      score: a.scores.overall,
      type: a.answerType || "partial",
    }));

    const narrativeFallback = {
      summary: `Interview average score ${overallScore}/100 across ${answers.length} answers.`,
      strengths: overallScore >= 70 ? ["Consistent performance"] : ["Shows effort and engagement"],
      improvements: overallScore < 70 ? ["Add more depth and specific examples"] : ["Polish communication clarity"],
      hiringReadiness: (overallScore >= 80 ? "ready" : overallScore >= 60 ? "developing" : "not_ready") as "ready" | "developing" | "not_ready",
    };

    const { data: narrative, valid } = await llmPromptJson(
      "evaluation",
      "session-evaluation",
      {
        overallScore,
        dimensions: JSON.stringify(dimensions),
        answerSummaries: JSON.stringify(answerSummaries),
      },
      SessionEvaluationSchema,
      narrativeFallback
    );

    return {
      result: {
        overallScore,
        dimensions,
        summary: narrative.summary,
        strengths: narrative.strengths,
        improvements: narrative.improvements,
        hiringReadiness: narrative.hiringReadiness,
        source: valid ? "heuristic-scores+llm-narrative" : "heuristic-only",
      },
      confidence: 0.9,
    };
  }),
  agent("coding-evaluation", "CodingEvaluationAgent", "Evaluate code submissions", "evaluation", ["judge0", "heuristic-scorer"], ["correctness", "complexity"], async (input) => {
    const result = await judge0Client.submit(input.code as string, (input.language as string) || "python", input.stdin as string);
    const problem = input.problem as Record<string, unknown> | undefined;
    const heuristic = evaluateCodeHeuristic(
      input.code as string,
      result,
      problem ? { title: String(problem.title || ""), description: String(problem.description || ""), difficulty: (problem.difficulty as "easy" | "medium" | "hard") || "medium", topics: (problem.topics as string[]) || [] } : undefined
    );
    return {
      result: {
        verdict: heuristic.verdict,
        passed: heuristic.passed,
        runtime: result.time,
        memory: result.memory,
        stdout: result.stdout,
        correctnessScore: heuristic.correctnessScore,
        complexityScore: heuristic.complexityScore,
        styleScore: heuristic.styleScore,
        overallScore: heuristic.overallScore,
        timeComplexity: heuristic.timeComplexity,
        spaceComplexity: heuristic.spaceComplexity,
        algorithmSkills: heuristic.algorithmSkills,
        problemSolving: heuristic.problemSolving,
        optimizationSkills: heuristic.optimizationSkills,
        signals: heuristic.signals,
        evaluationSource: result.source,
        source: "heuristic",
      },
      confidence: heuristic.passed ? 0.95 : 0.72,
    };
  }),
  agent("feedback", "FeedbackAgent", "Generate actionable interview feedback", "evaluation", ["feedback-templates", "prompt-registry"], ["actionability"], async (input) => {
    const scores = input.scores as Record<string, unknown>;
    const weaknesses = (input.weaknesses as string[]) || [];

    const fallback = {
      feedback: `Focus on improving: ${weaknesses.join(", ") || "communication and technical depth"}.`,
      actionableSteps: weaknesses.length
        ? weaknesses.map((w) => `Practice and improve: ${w}`)
        : ["Take another mock interview", "Review fundamentals", "Practice STAR-format answers"],
      priority: "high" as const,
      focusAreas: weaknesses.length ? weaknesses : ["communication"],
    };

    const { data: fb, valid } = await llmPromptJson(
      "evaluation",
      "feedback",
      {
        scores: JSON.stringify(scores),
        weaknesses: JSON.stringify(weaknesses),
        targetRole: (input.targetRole as string) || "Software Engineer",
      },
      FeedbackSchema,
      fallback
    );

    return {
      result: {
        feedback: fb.feedback,
        actionableSteps: fb.actionableSteps,
        priority: fb.priority,
        focusAreas: fb.focusAreas,
        actionable: true,
        source: valid ? "llm-v2" : "template-fallback",
      },
      confidence: valid ? 0.86 : 0.78,
    };
  }),

  // Question Intelligence (15-16)
  agent("question-generation", "QuestionGenerationAgent", "Generate adaptive interview questions", "question", ["question-bank", "resume-data", "qdrant", "prompt-registry"], ["novelty", "relevance"], async (input) => {
    const bank = (input.bank as string[]) || [];
    const asked = new Set((input.asked as string[]) || []);
    const available = bank.filter((q) => !asked.has(q));
    const interviewType = (input.type as string) || "technical";
    const context = (input.context as Record<string, unknown>) || {};
    const vars = {
      interviewType,
      targetRole: (context.targetRole as string) || (context.role as string) || "Software Engineer",
      difficulty: (context.difficulty as string) || "medium",
      skills: JSON.stringify(context.skills || []),
      resumeContext: JSON.stringify(context).slice(0, 2000),
      previousAnswers: JSON.stringify(context.previousAnswers || []).slice(0, 2500),
      lastAnswer: (context.lastAnswer as string) || "",
      asked: JSON.stringify([...asked]),
    };

    const promptVersion = (process.env.PROMPT_VERSION || "v2") as "v1" | "v2";

    try {
      if (promptVersion === "v2") {
        const { data: generated, valid } = await llmPromptJson(
          "technical",
          "question-generation",
          vars,
          QuestionGenerationSchema,
          { question: "", difficulty: "medium" as const }
        );
        const q = generated.question?.trim();
        if (valid && q && q.length >= 10 && !asked.has(q)) {
          return {
            result: { question: q, difficulty: generated.difficulty, rationale: generated.rationale, source: "llm-v2" },
            confidence: 0.88,
          };
        }
      } else {
        const category = questionPromptCategory(interviewType);
        const raw = await llmFromPrompt(category, "question-generation", vars, { version: "v1" });
        const cleaned = cleanPlainText(raw);
        if (cleaned.length >= 10 && !asked.has(cleaned)) {
          return { result: { question: cleaned, source: "llm-v1" }, confidence: 0.86 };
        }
      }
    } catch {
      // fall through to bank
    }

    const selected = available[Math.floor(Math.random() * available.length)] || bank[0] || "Tell me about a project you're proud of and your specific contribution.";
    return { result: { question: selected, source: "bank" }, confidence: 0.78 };
  }),
  agent("question-selection", "QuestionSelectionAgent", "Select optimal questions from bank", "question", ["question-bank", "difficulty-engine"], ["difficulty-match"], async (input) => {
    const bank = (input.bank as string[]) || [];
    const asked = new Set((input.asked as string[]) || []);
    const available = bank.filter((q) => !asked.has(q));
    const selected = available[Math.floor(Math.random() * available.length)] || bank[0];
    return { result: { question: selected, remaining: available.length - 1 }, confidence: 0.88 };
  }),

  // Company Intelligence (17-18)
  agent("company-intelligence", "CompanyIntelligenceAgent", "Analyze company culture and requirements", "company", ["company-db"], ["culture-match"], async (input, _ctx, complete) => {
    const text = await complete(`Analyze company ${input.companyName} for interview preparation`);
    return { result: { intelligence: text }, confidence: 0.8 };
  }),
  agent("role-intelligence", "RoleIntelligenceAgent", "Analyze role requirements and expectations", "company", ["role-db"], ["skill-match"], async (input, _ctx, complete) => {
    const text = await complete(`Analyze role ${input.roleTitle} at ${input.companyName}`);
    return { result: { requirements: text }, confidence: 0.82 };
  }),

  // Communication Intelligence (19-20)
  agent("communication", "CommunicationAgent", "Analyze and improve communication patterns", "communication", ["speech-analyzer"], ["clarity", "structure"], async (input, _ctx, complete) => {
    const text = await complete(`Analyze communication quality: "${input.transcript}"`);
    return { result: { analysis: text, clarityScore: 75 }, confidence: 0.8 };
  }),
  agent("voice-analysis", "VoiceAnalysisAgent", "Analyze spoken delivery and communication", "communication", ["speech-analyzer"], ["pace", "fillers", "clarity"], async (input) => {
    const { runVoiceAnalysisAgent } = await import("./voice-analysis-agent");
    const analysis = await runVoiceAnalysisAgent({
      transcript: String(input.transcript || ""),
      audioDurationMs: input.audioDurationMs as number | undefined,
      answerConfidence: input.answerConfidence as number | undefined,
      interviewType: String(input.interviewType || "technical"),
    });
    return { result: analysis, confidence: analysis.confidenceEstimate / 100 };
  }),
  agent("voice-interview", "VoiceInterviewAgent", "Conduct voice-based interviews", "communication", ["whisper", "xtts"], ["fluency"], async (input) => {
    const { voiceInterviewAgent } = await import("./voice-interview-agent");
    const transcript = String(input.transcript || "");
    const voiceProfile = String(input.voiceProfile || "professional");
    const tts = await voiceInterviewAgent.speakQuestion(transcript.slice(0, 200) || "Please continue.", voiceProfile);
    return {
      result: { response: transcript, mode: "voice", ttsSource: tts.source },
      confidence: 0.85,
    };
  }),

  // Panel Intelligence (21)
  agent("panel-moderator", "PanelModeratorAgent", "Moderate panel interviews and select speakers", "panel", ["persona-engine"], ["turn-management"], async (input) => {
    const { runPanelModerator } = await import("./panel-moderator-agent");
    const decision = runPanelModerator({
      panel: (input.panel as Array<{ id: string; persona: string; name: string; role: string; lastSpokeAt?: string }>) || [],
      answer: (input.answer as string) || "",
      answerScore: (input.answerScore as number) || 60,
      turnCount: (input.turnCount as number) || 0,
      maxTurns: (input.maxTurns as number) || 8,
      recentTranscript: (input.recentTranscript as Array<{ speaker: string; text: string; role: string }>) || [],
      targetRole: input.targetRole as string,
    });
    return {
      result: {
        nextSpeaker: { id: decision.nextSpeakerId, persona: decision.nextSpeakerPersona },
        action: decision.action,
        reason: decision.reason,
        interrupted: decision.interrupted,
      },
      confidence: 0.92,
    };
  }),

  // Career Intelligence (22-24)
  agent("career-coach", "CareerCoachAgent", "Provide personalized career mentorship", "career", ["course-catalog", "recommendation-engine", "prompt-registry"], ["personalization"], async (input) => {
    const metrics = (input.metrics as Record<string, number>) || {};
    const fallback = {
      summary: "Focus on closing skill gaps to improve placement readiness.",
      strengths: (input.strengths as string[]) || ["Shows engagement"],
      weaknesses: (input.weaknesses as string[]) || [],
      recommendations: [{ title: "Practice mock interviews", description: "Build interview confidence", priority: "high" as const, category: "interview" }],
      focusAreas: Object.keys((input.skillGaps as Record<string, number>) || {}),
    };
    const { data, valid, source } = await llmPromptJson(
      "career",
      "recommendations",
      {
        metrics: JSON.stringify(metrics),
        weaknesses: JSON.stringify(input.weaknesses || []),
        skillGaps: JSON.stringify(input.skillGaps || {}),
        targetRole: (input.targetRole as string) || "Software Engineer",
        resumeScore: (input.resumeScore as number) || 0,
        interviewScore: (input.interviewScore as number) || 0,
        codingSummary: JSON.stringify(input.codingEvaluations || []),
        githubSummary: (input.githubSummary as string) || "No data",
        linkedinSummary: (input.linkedinSummary as string) || "No data",
      },
      CareerRecommendationsSchema,
      fallback
    );
    return { result: { ...data, source: valid ? `llm-${source}` : "heuristic-fallback" }, confidence: valid ? 0.86 : 0.78 };
  }),
  agent("placement-readiness", "PlacementReadinessAgent", "Compute placement readiness scores", "placement", ["scoring-engine"], ["holistic-score"], async (input) => {
    const metrics = (input.metrics as Record<string, number>) || {
      interviewReadiness: (input.interviewScore as number) || 0,
      codingReadiness: (input.codingScore as number) || 0,
      technical: (input.technicalScore as number) || 0,
      communication: (input.communicationScore as number) || 0,
      confidence: (input.confidenceScore as number) || 0,
    };
    const placement = computePlacementHeuristic(metrics);
    return { result: { ...placement, source: "heuristic" }, confidence: 0.92 };
  }),
  agent("learning-roadmap", "LearningRoadmapAgent", "Generate personalized learning roadmaps", "career", ["course-catalog", "skill-taxonomy", "prompt-registry"], ["progression"], async (input) => {
    const fallback = {
      title: `${input.targetRole || "Career"} Learning Roadmap`,
      summary: "Step-by-step plan to close skill gaps",
      items: [{ title: "Daily DSA practice", type: "practice" as const, priority: 1, estimatedWeeks: 4, description: "30 min/day" }],
    };
    const { data, valid, source } = await llmPromptJson(
      "career",
      "roadmap",
      {
        targetRole: (input.targetRole as string) || "Software Engineer",
        skillGaps: JSON.stringify(input.skillGaps || input.gaps || {}),
        recommendations: JSON.stringify(input.recommendations || []),
        placementScore: (input.placementScore as number) || 50,
      },
      LearningRoadmapSchema,
      fallback
    );
    return { result: { ...data, source: valid ? `llm-${source}` : "heuristic-fallback" }, confidence: valid ? 0.85 : 0.76 };
  }),

  // Platform Intelligence (25-28)
  agent("github-analysis", "GithubAnalysisAgent", "Analyze GitHub profile and projects", "platform", ["github-api"], ["project-quality"], async (input) => {
    const raw = await githubClient.fetchProfile((input.username as string) || "student", input.token as string);
    const { analyzeGitHubProfile } = await import("../evaluators/professional-profile-evaluator");
    const analysis = analyzeGitHubProfile(raw);
    return { result: analysis, confidence: 0.85 };
  }),
  agent("linkedin-analysis", "LinkedInAnalysisAgent", "Analyze LinkedIn profile", "platform", ["linkedin-api"], ["profile-completeness"], async (input) => {
    const raw = await linkedinClient.fetchProfile(input.token as string);
    const { analyzeLinkedInProfile } = await import("../evaluators/professional-profile-evaluator");
    const analysis = analyzeLinkedInProfile(raw);
    return { result: analysis, confidence: 0.8 };
  }),
  agent("assignment-performance", "AssignmentPerformanceAgent", "Analyze assignment performance patterns", "platform", ["lms-data"], ["trend-analysis"], async (input) => {
    const submissions = (input.submissions as Array<{ score: number }>) || [];
    const avg = submissions.length ? submissions.reduce((s, x) => s + x.score, 0) / submissions.length : 0;
    return { result: { averageScore: avg, trend: avg >= 70 ? "improving" : "needs-work" }, confidence: 0.88 };
  }),
  agent("exam-performance", "ExamPerformanceAgent", "Analyze exam performance patterns", "platform", ["lms-data"], ["weak-topic-detection"], async (input) => {
    const attempts = (input.attempts as Array<{ score: number }>) || [];
    const avg = attempts.length ? attempts.reduce((s, x) => s + x.score, 0) / attempts.length : 0;
    return { result: { averageScore: avg, readiness: avg >= 75 ? "ready" : "practice-more" }, confidence: 0.87 };
  }),

  // Placement Intelligence (29-30)
  agent("mock-placement-drive", "MockPlacementDriveAgent", "Simulate placement drive scenarios", "placement", ["company-db", "interview-engine"], ["realism"], async (input, _ctx, complete) => {
    const text = await complete(`Simulate placement drive for ${input.company} role ${input.role}`);
    return { result: { scenario: text, rounds: ["aptitude", "technical", "hr"] }, confidence: 0.82 };
  }),
  agent("recruiter-screening", "RecruiterScreeningAgent", "Screen candidates for recruiters", "placement", ["ranking-engine"], ["fit-score"], async (input) => {
    const score = (input.placementScore as number) || 0;
    return { result: { screened: score >= 60, recommendation: score >= 80 ? "Strong Hire" : score >= 60 ? "Interview" : "Reject" }, confidence: 0.85 };
  }),

  // Advanced Intelligence (31-37)
  agent("digital-twin", "DigitalTwinAgent", "Maintain persistent student intelligence profile", "advanced", ["memory-store", "qdrant"], ["profile-accuracy"], async (input, ctx) => {
    if (ctx.userId) {
      await prisma.studentIntelligenceProfile.upsert({
        where: { userId: ctx.userId },
        create: { userId: ctx.userId, strengths: (input.strengths as string[]) || [], weaknesses: (input.weaknesses as string[]) || [] },
        update: { strengths: (input.strengths as string[]) || [], weaknesses: (input.weaknesses as string[]) || [], updatedAt: new Date() },
      });
    }
    return { result: { updated: true, snapshot: input }, confidence: 0.9 };
  }),
  agent("personal-branding", "PersonalBrandingAgent", "Optimize personal brand across platforms", "advanced", ["linkedin", "github", "portfolio"], ["consistency"], async (input, _ctx, complete) => {
    const text = await complete(`Personal branding advice for ${input.targetRole}: ${JSON.stringify(input.profiles)}`);
    return { result: { advice: text }, confidence: 0.8 };
  }),
  agent("confidence-coach", "ConfidenceCoachAgent", "Build interview confidence", "advanced", ["speech-analyzer"], ["confidence-building"], async (input, _ctx, complete) => {
    const text = await complete(`Confidence coaching for interview anxiety. Signals: ${JSON.stringify(input.signals)}`);
    return { result: { exercises: text }, confidence: 0.78 };
  }),
  agent("project-review", "ProjectReviewAgent", "Review and critique student projects", "advanced", ["github-api"], ["technical-depth"], async (input, _ctx, complete) => {
    const text = await complete(`Review project: ${JSON.stringify(input.project)}`);
    return { result: { review: text, score: 75 }, confidence: 0.82 };
  }),
  agent("industry-readiness", "IndustryReadinessAgent", "Assess industry-specific readiness", "advanced", ["industry-db"], ["domain-knowledge"], async (input, _ctx, complete) => {
    const text = await complete(`Industry readiness for ${input.industry} as ${input.targetRole}`);
    return { result: { readiness: text, score: 70 }, confidence: 0.8 };
  }),
  agent("hackathon-coach", "HackathonCoachAgent", "Coach students for hackathons", "advanced", ["project-templates"], ["ideation"], async (input, _ctx, complete) => {
    const text = await complete(`Hackathon coaching for theme: ${input.theme}, skills: ${JSON.stringify(input.skills)}`);
    return { result: { strategy: text }, confidence: 0.79 };
  }),
  agent("group-discussion", "GroupDiscussionAgent", "Simulate and evaluate group discussions", "advanced", ["gd-topics"], ["leadership-signals"], async (input, _ctx, complete) => {
    const text = await complete(`Group discussion topic and evaluation for: ${input.topic}`);
    return { result: { topic: text, evaluationCriteria: ["leadership", "clarity", "teamwork"] }, confidence: 0.77 };
  }),

  // Enterprise Intelligence (38-41)
  agent("candidate-ranking", "CandidateRankingAgent", "Rank candidates for placement drives", "enterprise", ["ranking-engine"], ["fairness"], async (input) => {
    const candidates = (input.candidates as Array<{ id: string; score: number }>) || [];
    const ranked = [...candidates].sort((a, b) => b.score - a.score).map((c, i) => ({ ...c, rank: i + 1 }));
    return { result: { rankings: ranked }, confidence: 0.92 };
  }),
  agent("hiring-recommendation", "HiringRecommendationAgent", "Generate hiring recommendations", "enterprise", ["scoring-engine"], ["decision-confidence"], async (input) => {
    const score = (input.score as number) || 0;
    return { result: { decision: score >= 80 ? "hire" : score >= 60 ? "interview" : "reject", confidence: score / 100 }, confidence: 0.88 };
  }),
  agent("college-analytics", "CollegeAnalyticsAgent", "Generate college-level analytics", "enterprise", ["analytics-engine"], ["actionable-insights"], async (input) => {
    return { result: { metrics: input.metrics, insights: ["Placement rate trending up", "Technical scores need improvement in CS dept"] }, confidence: 0.85 };
  }),
  agent("placement-analytics", "PlacementAnalyticsAgent", "Generate placement analytics", "enterprise", ["analytics-engine"], ["trend-detection"], async (input) => {
    return { result: { placementRate: input.rate || 72, topSkills: ["React", "Python", "DSA"], insights: ["Mock interview participation correlates with placement success"] }, confidence: 0.86 };
  }),

  // Premium Future Agents (42-46)
  agent("virtual-manager", "VirtualManagerAgent", "Simulate manager interactions", "premium", ["persona-engine"], ["realism"], async (input, _ctx, complete) => {
    const text = await complete(`Virtual manager scenario: ${input.scenario}`);
    return { result: { dialogue: text }, confidence: 0.75 };
  }),
  agent("workplace-simulation", "WorkplaceSimulationAgent", "Simulate workplace scenarios", "premium", ["scenario-engine"], ["decision-quality"], async (input, _ctx, complete) => {
    const text = await complete(`Workplace simulation: ${input.scenario}`);
    return { result: { scenario: text, choices: ["A", "B", "C"] }, confidence: 0.76 };
  }),
  agent("leadership-assessment", "LeadershipAssessmentAgent", "Assess leadership potential", "premium", ["assessment-rubric"], ["leadership-signals"], async (input, _ctx, complete) => {
    const text = await complete(`Leadership assessment based on: ${JSON.stringify(input.responses)}`);
    return { result: { assessment: text, score: 72 }, confidence: 0.8 };
  }),
  agent("team-compatibility", "TeamCompatibilityAgent", "Assess team compatibility", "premium", ["personality-engine"], ["team-fit"], async (input, _ctx, complete) => {
    const text = await complete(`Team compatibility analysis: ${JSON.stringify(input.profile)}`);
    return { result: { compatibility: text, score: 78 }, confidence: 0.77 };
  }),
  agent("startup-mentor", "StartupMentorAgent", "Provide startup mentorship", "premium", ["startup-kb"], ["entrepreneurship"], async (input, _ctx, complete) => {
    const text = await complete(`Startup mentorship for idea: ${input.idea}`);
    return { result: { advice: text }, confidence: 0.74 };
  }),

  // Platform Control (47)
  agent("interview-orchestrator", "InterviewOrchestratorAgent", "Orchestrate complete interview workflows", "orchestrator", ["all-interview-agents", "langgraph"], ["flow-control"], async (input, ctx) => {
    const type = (input.type as string) || "technical";
    const agentMap: Record<string, string> = {
      hr: "hr-interview", technical: "technical-interview", behavioral: "behavioral-interview",
      coding: "coding-interview", system_design: "technical-interview", panel: "panel-moderator", voice: "voice-interview",
    };
    const targetAgent = agentMap[type] || "technical-interview";
    return {
      result: { orchestrated: true, activeAgent: targetAgent, phase: input.phase || "greet" },
      confidence: 0.95,
      handoff: { targetAgentId: targetAgent, payload: input },
    };
  }),

  // Coding OS (48-50)
  agent("problem-generation", "ProblemGenerationAgent", "Generate unique coding problems from student profile", "coding", ["digital-twin", "prompt-registry", "question-bank"], ["personalization", "company-targeting"], async (input, ctx) => {
    if (!ctx.userId) throw new Error("userId required");
    const { generateAndStoreProblem } = await import("@/server/coding-os/problem-generation-service");
    const problem = await generateAndStoreProblem({
      userId: ctx.userId,
      targetCompany: input.targetCompany as string | undefined,
      category: input.category as import("@prisma/client").CodeProblemCategory | undefined,
      difficulty: input.difficulty as import("@prisma/client").CodeDifficulty | undefined,
    });
    return { result: { problemId: problem.id, slug: problem.slug, title: problem.title }, confidence: 0.88 };
  }),

  agent("code-review", "CodeReviewAgent", "AI code review after submission", "coding", ["prompt-registry", "heuristic-scorer"], ["readability", "complexity", "best-practices"], async (input) => {
    const { runCodeReview } = await import("@/server/coding-os/code-review-service");
    const report = await runCodeReview(input.submissionId as string);
    return { result: report, confidence: 0.85 };
  }),

  agent("coding-mentor", "CodingMentorAgent", "Explain problems and build practice plans", "coding", ["digital-twin", "prompt-registry"], ["mentorship", "roadmap"], async (input, _ctx, complete) => {
    const problem = input.problem ? JSON.stringify(input.problem) : "general practice";
    const reply = await complete(
      `Mode: ${input.mode || "explain"}. Student: ${input.message}. Problem context: ${problem}. Weak areas: ${JSON.stringify(input.weakAreas || [])}. Recommended next topic: ${JSON.stringify(input.recommendedNext || null)}.`,
      "You are a supportive coding mentor. Explain approaches, time/space complexity, and study plans. Do not paste full solutions unless the student explicitly asks."
    );
    return { result: { reply }, confidence: 0.9 };
  }),
];

export function registerAllAgents(): void {
  for (const a of agents) {
    agentRegistry.register(a);
  }
}
