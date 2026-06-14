import { agentRegistry } from "../../core/agent/agent-registry";
import { createAgent } from "../../career-intelligence/agents/agent-builder";
import {
  gatherCandidateIntelligence,
  listTalentCandidates,
  matchJobToCandidates,
  buildTalentRadar,
  runCopilotQuery,
} from "../services/talent-intelligence-service";
import { computeGrowthPotential } from "../engines/growth-potential-engine";
import { computeJobFit } from "../engines/job-fit-engine";
import { computeHiringRecommendation } from "../engines/hiring-recommendation-engine";
import { prisma } from "../../core/db/prisma";

/** Register PR-10 talent intelligence agents (extends BaseAgent) */
export function registerTalentAgents(): void {
  const agents = [
    createAgent(
      {
        id: "recruiter-screening",
        name: "RecruiterScreeningAgent",
        objective: "Screen candidates using Digital Twin intelligence",
        category: "talent",
        tools: ["digital-twin", "placement-readiness"],
        evaluationRules: ["twin-first", "no-resume-only"],
      },
      async (input, ctx) => {
        const userId = (input.candidateId as string) || ctx.userId;
        if (!userId) return { result: { fitScore: 0 }, confidence: 0.3 };
        const intel = await gatherCandidateIntelligence(userId);
        if (!intel) return { result: { fitScore: 0, reason: "No twin data" }, confidence: 0.4 };
        const score = Math.round(intel.placementReadiness * 0.4 + intel.growthPotentialScore * 0.35 + intel.professionalReadiness * 0.25);
        return {
          result: { fitScore: score, recommendation: score >= 65 ? "advance" : "hold", intel },
          confidence: 0.88,
        };
      }
    ),

    createAgent(
      {
        id: "talent-matching",
        name: "TalentMatchingAgent",
        objective: "Match candidates to job descriptions via Digital Twin",
        category: "talent",
        tools: ["job-fit-engine", "digital-twin"],
        evaluationRules: ["multi-signal-match"],
      },
      async (input) => {
        const jobId = input.jobId as string;
        if (jobId) {
          const matches = await matchJobToCandidates(jobId);
          return { result: { matches: matches.slice(0, 20) }, confidence: 0.9 };
        }
        return { result: { matches: [] }, confidence: 0.5 };
      }
    ),

    createAgent(
      {
        id: "candidate-ranking",
        name: "CandidateRankingAgent",
        objective: "Rank candidates by twin-powered potential",
        category: "talent",
        tools: ["ranking-engine", "digital-twin"],
        evaluationRules: ["fairness", "growth-weighted"],
      },
      async (input) => {
        const candidates = await listTalentCandidates(50);
        const jobId = input.jobId as string | undefined;
        let ranked = candidates.map((c) => ({
          id: c.userId,
          name: c.name,
          score: Math.round(c.placementReadiness * 0.45 + c.growthPotentialScore * 0.35 + c.careerVelocityScore * 0.2),
          growthTier: c.growthTier,
        }));
        ranked.sort((a, b) => b.score - a.score);
        ranked = ranked.map((r, i) => ({ ...r, rank: i + 1 }));

        if (jobId) {
          const dbMatches = await prisma.talentMatch.findMany({ where: { jobId }, orderBy: { ranking: "asc" } });
          if (dbMatches.length) {
            ranked = dbMatches.map((m) => ({
              id: m.candidateId,
              name: candidates.find((c) => c.userId === m.candidateId)?.name || m.candidateId,
              score: m.overallMatch,
              rank: m.ranking || 0,
              growthTier: candidates.find((c) => c.userId === m.candidateId)?.growthTier || "medium",
            }));
          }
        }
        return { result: { rankings: ranked }, confidence: 0.91 };
      }
    ),

    createAgent(
      {
        id: "hiring-recommendation",
        name: "HiringRecommendationAgent",
        objective: "Generate hiring decisions from twin signals",
        category: "talent",
        tools: ["hiring-engine", "digital-twin"],
        evaluationRules: ["explainable-decisions"],
      },
      async (input, ctx) => {
        const userId = (input.candidateId as string) || ctx.userId;
        if (!userId) return { result: {}, confidence: 0.3 };
        const intel = await gatherCandidateIntelligence(userId);
        if (!intel) return { result: {}, confidence: 0.3 };
        const rec = computeHiringRecommendation({
          placementReadiness: intel.placementReadiness,
          growthPotentialScore: intel.growthPotentialScore,
          careerVelocityScore: intel.careerVelocityScore,
          panelReadiness: intel.panelReadiness,
          professionalReadiness: intel.professionalReadiness,
          twinStrengths: intel.digitalTwinSummary.strengths,
          twinWeaknesses: intel.digitalTwinSummary.weaknesses,
          overallMatch: input.overallMatch as number | undefined,
        });
        return { result: rec, confidence: rec.confidence };
      }
    ),

    createAgent(
      {
        id: "growth-potential",
        name: "GrowthPotentialAgent",
        objective: "Predict candidate growth trajectory",
        category: "talent",
        tools: ["growth-engine", "trend-analysis"],
        evaluationRules: ["forward-looking"],
      },
      async (input, ctx) => {
        const userId = (input.candidateId as string) || ctx.userId;
        if (!userId) return { result: {}, confidence: 0.3 };
        const intel = await gatherCandidateIntelligence(userId);
        if (!intel) return { result: {}, confidence: 0.3 };
        return {
          result: {
            score: intel.growthPotentialScore,
            tier: intel.growthTier,
            message: `What can this candidate become? Growth tier: ${intel.growthTier}`,
          },
          confidence: 0.87,
        };
      }
    ),

    createAgent(
      {
        id: "job-fit",
        name: "JobFitAgent",
        objective: "Compute multi-dimensional job fit from twin data",
        category: "talent",
        tools: ["job-fit-engine"],
        evaluationRules: ["skill-match", "twin-signals"],
      },
      async (input, ctx) => {
        const userId = (input.candidateId as string) || ctx.userId;
        const intel = userId ? await gatherCandidateIntelligence(userId) : null;
        if (!intel) return { result: {}, confidence: 0.3 };
        const fit = computeJobFit({
          jobSkills: (input.skills as string[]) || [],
          jobTitle: (input.jobTitle as string) || "Software Engineer",
          jobDescription: (input.jobDescription as string) || "",
          candidate: {
            technicalScore: intel.technicalScore,
            codingReadiness: intel.codingScore,
            communicationScore: intel.communicationScore,
            confidenceScore: intel.confidenceScore,
            panelReadiness: intel.panelReadiness,
            professionalReadiness: intel.professionalReadiness,
            githubScore: intel.githubScore,
            linkedinScore: intel.linkedinScore,
            leetcodeScore: intel.leetcodeScore,
            skills: (input.skills as string[])?.length
              ? (input.skills as string[])
              : intel.digitalTwinSummary.strengths,
            strengths: intel.digitalTwinSummary.strengths,
          },
        });
        return { result: fit, confidence: 0.89 };
      }
    ),

    createAgent(
      {
        id: "talent-radar",
        name: "TalentRadarAgent",
        objective: "Surface top talent segments across the ecosystem",
        category: "talent",
        tools: ["radar-engine", "digital-twin"],
        evaluationRules: ["segment-accuracy"],
      },
      async () => {
        const radar = await buildTalentRadar();
        return { result: { segments: radar.map((r) => ({ category: r.category, title: r.title, count: r.candidateIds.length })), radar }, confidence: 0.9 };
      }
    ),

    createAgent(
      {
        id: "recruiter-copilot",
        name: "RecruiterCopilotAgent",
        objective: "Natural language talent queries powered by Digital Twin",
        category: "talent",
        tools: ["copilot", "digital-twin", "search"],
        evaluationRules: ["twin-grounded"],
      },
      async (input, ctx) => {
        const query = (input.query as string) || "";
        const recruiterId = ctx.userId || "";
        const result = await runCopilotQuery(query, recruiterId);
        return { result, confidence: 0.86 };
      }
    ),
  ];

  for (const a of agents) {
    agentRegistry.register(a);
  }
}
