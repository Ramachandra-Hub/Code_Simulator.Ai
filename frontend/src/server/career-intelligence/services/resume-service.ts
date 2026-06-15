import { prisma } from "../../core/db/prisma";

import { AgentFactory } from "../../core/agent/agent-factory";

import { agentEventBus } from "../../core/events/agent-event-bus";

import { computeAtsScore, computeAiQualityScore } from "../evaluators/ats-scoring-engine";



export async function saveResume(userId: string, data: Record<string, unknown>, resumeId?: string) {

  const targetRole = (data.targetRole as string) || "Software Engineer";



  let resume;

  if (resumeId) {

    const existing = await prisma.resume.findFirst({ where: { id: resumeId, userId } });

    if (!existing) throw new Error("Resume not found");

    resume = await prisma.resume.update({

      where: { id: resumeId },

      data: {

        name: (data.name as string) || existing.name,

        email: (data.email as string) || existing.email,

        phone: (data.phone as string) || null,

        location: (data.location as string) || null,

        title: (data.title as string) || existing.title,

        targetRole,

        summary: (data.summary as string) || null,

        data: data as object,

        aiEnhanced: (data.aiEnhanced as boolean) || false,

      },

    });

    const versionCount = await prisma.resumeVersion.count({ where: { resumeId } });

    await prisma.resumeVersion.create({

      data: { resumeId, version: versionCount + 1, data: data as object },

    });

  } else {

    await prisma.resume.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });

    resume = await prisma.resume.create({

      data: {

        userId,

        name: (data.name as string) || "",

        email: (data.email as string) || "",

        phone: (data.phone as string) || null,

        location: (data.location as string) || null,

        title: (data.title as string) || "",

        targetRole,

        summary: (data.summary as string) || null,

        data: data as object,

        aiEnhanced: (data.aiEnhanced as boolean) || false,

        isActive: true,

      },

    });

    await prisma.resumeVersion.create({

      data: { resumeId: resume.id, version: 1, data: data as object },

    });

  }



  const atsResult = computeAtsScore(data, targetRole);



  await prisma.atsScore.create({

    data: {

      resumeId: resume.id,

      score: atsResult.score,

      feedback: atsResult.feedback,

      keywordsMatched: atsResult.keywordsMatched,

      keywordsMissing: atsResult.keywordsMissing.slice(0, 12),

      keywords: { breakdown: atsResult.breakdown, keywordMatchPct: atsResult.keywordMatchPct } as object,

    },

  });



  await agentEventBus.emit("resume.updated", {

    userId,

    resumeId: resume.id,

    atsScore: atsResult.score,

    targetRole: resume.targetRole,

    skills: (data.skills as string[]) || [],

  });



  return {

    ...resume,

    atsScore: atsResult.score,

    atsFeedback: atsResult.feedback,

    keywordsMatched: atsResult.keywordsMatched,

    keywordsMissing: atsResult.keywordsMissing,

    atsBreakdown: atsResult.breakdown,

    keywordMatchPct: atsResult.keywordMatchPct,

  };

}



export async function getResumes(userId: string) {

  return prisma.resume.findMany({

    where: { userId },

    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],

    include: {

      atsScores: { orderBy: { createdAt: "desc" }, take: 1 },

      versions: { orderBy: { version: "desc" }, take: 1 },

    },

  });

}



export async function getActiveResume(userId: string) {

  const active = await prisma.resume.findFirst({

    where: { userId, isActive: true },

    include: { atsScores: { orderBy: { createdAt: "desc" }, take: 1 } },

  });

  if (active) return active;

  return prisma.resume.findFirst({

    where: { userId },

    orderBy: { updatedAt: "desc" },

    include: { atsScores: { orderBy: { createdAt: "desc" }, take: 1 } },

  });

}



export async function setActiveResume(userId: string, resumeId: string) {

  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });

  if (!resume) throw new Error("Resume not found");

  await prisma.resume.updateMany({ where: { userId }, data: { isActive: false } });

  return prisma.resume.update({ where: { id: resumeId }, data: { isActive: true } });

}



export async function getResumeVersions(userId: string, resumeId: string) {

  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });

  if (!resume) throw new Error("Resume not found");

  return prisma.resumeVersion.findMany({

    where: { resumeId },

    orderBy: { version: "desc" },

  });

}



export async function analyzeResume(userId: string, data: Record<string, unknown>, resumeId?: string) {

  const targetRole = (data.targetRole as string) || "Software Engineer";

  const atsResult = computeAtsScore(data, targetRole);

  const baselineAiScore = computeAiQualityScore(data, atsResult);



  const analysisAgent = AgentFactory.create("resume-analysis");

  const analysisOut = await analysisAgent.run(

    {

      data,

      atsScore: atsResult.score,

      keywordMatchPct: atsResult.keywordMatchPct,

      targetRole,

      atsBreakdown: atsResult.breakdown,

    },

    { userId }

  );

  const result = analysisOut.result as {

    analysis: string;

    score: number;

    aiQualityScore: number;

    strengths: string[];

    gaps: string[];

    keywordSuggestions: string[];

    atsTips: string[];

    source: string;

  };



  const aiQualityScore = result.aiQualityScore ?? baselineAiScore;



  const record = await prisma.resumeAnalysisRecord.create({

    data: {

      userId,

      resumeId: resumeId || null,

      atsScore: atsResult.score,

      keywordsMatched: atsResult.keywordsMatched,

      keywordsMissing: atsResult.keywordsMissing.slice(0, 12),

      strengths: result.strengths,

      weaknesses: result.gaps,

      recommendations: result.atsTips,

      summary: result.analysis,

      atsTips: result.atsTips,

      keywordSuggestions: result.keywordSuggestions,

      source: `ats-engine+${result.source}`,

      raw: {

        aiQualityScore,

        atsBreakdown: atsResult.breakdown,

        keywordMatchPct: atsResult.keywordMatchPct,

      } as object,

    },

  });



  if (resumeId) {

    await prisma.atsScore.create({

      data: {

        resumeId,

        score: atsResult.score,

        feedback: atsResult.feedback,

        keywordsMatched: atsResult.keywordsMatched,

        keywordsMissing: atsResult.keywordsMissing.slice(0, 12),

        keywords: { analysis: result, breakdown: atsResult.breakdown } as object,

      },

    });

  }



  await agentEventBus.emit("resume.updated", {
    userId,
    resumeId,
    atsScore: atsResult.score,
    aiQualityScore,
    targetRole,
  });



  return {

    id: record.id,

    atsScore: atsResult.score,

    aiQualityScore,

    keywordMatchPct: atsResult.keywordMatchPct,

    atsBreakdown: atsResult.breakdown,

    keywordsMatched: atsResult.keywordsMatched,

    keywordsMissing: atsResult.keywordsMissing,

    strengths: result.strengths,

    weaknesses: result.gaps,

    recommendations: result.atsTips,

    keywordSuggestions: result.keywordSuggestions,

    summary: result.analysis,

    atsTips: result.atsTips,

    atsFeedback: atsResult.feedback,

    source: record.source,

  };

}



export async function getLatestAnalysis(userId: string, resumeId?: string) {

  const record = await prisma.resumeAnalysisRecord.findFirst({

    where: { userId, ...(resumeId ? { resumeId } : {}) },

    orderBy: { createdAt: "desc" },

  });

  if (!record) return null;

  const raw = (record.raw as { aiQualityScore?: number; atsBreakdown?: unknown; keywordMatchPct?: number }) || {};

  return {

    ...record,

    aiQualityScore: raw.aiQualityScore,

    atsBreakdown: raw.atsBreakdown,

    keywordMatchPct: raw.keywordMatchPct,

  };

}



export async function enhanceResume(userId: string, resumeId: string) {

  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });

  if (!resume) throw new Error("Resume not found");



  const builder = AgentFactory.create("resume-builder");

  const result = await builder.run({ targetRole: resume.targetRole, data: resume.data }, { userId });

  const enhanced = result.result as { summary: string };



  const updated = await prisma.resume.update({

    where: { id: resumeId },

    data: {

      summary: enhanced.summary,

      aiEnhanced: true,

      data: { ...(resume.data as object), summary: enhanced.summary, aiEnhanced: true },

    },

  });



  const versionCount = await prisma.resumeVersion.count({ where: { resumeId } });

  await prisma.resumeVersion.create({

    data: { resumeId, version: versionCount + 1, data: updated.data as object },

  });



  return updated;

}


