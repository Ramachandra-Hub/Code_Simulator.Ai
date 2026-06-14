import { prisma } from "../../core/db/prisma";
import { AgentFactory } from "../../core/agent/agent-factory";
import { agentEventBus } from "../../core/events/agent-event-bus";
import { TARGET_ROLE_KEYWORDS } from "@/lib/resume-types";

function computeKeywordMatch(data: Record<string, unknown>, targetRole: string) {
  const roleKeywords = TARGET_ROLE_KEYWORDS[targetRole] || TARGET_ROLE_KEYWORDS["Software Engineer"];
  const skills = ((data.skills as string[]) || []).join(" ");
  const text = [
    data.summary,
    skills,
    JSON.stringify(data.projects || []),
    JSON.stringify(data.experience || []),
  ]
    .join(" ")
    .toLowerCase();
  const matched = roleKeywords.filter((kw) => text.includes(kw.toLowerCase()));
  const missing = roleKeywords.filter((kw) => !matched.includes(kw));
  return { matched, missing, roleKeywords };
}

export async function saveResume(userId: string, data: Record<string, unknown>, resumeId?: string) {
  const targetRole = (data.targetRole as string) || "Software Engineer";
  const { matched, missing } = computeKeywordMatch(data, targetRole);

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

  const atsAgent = AgentFactory.create("ats-agent");
  const ats = await atsAgent.run({ data }, { userId });
  const atsResult = ats.result as { score: number; feedback: string[] };

  await prisma.atsScore.create({
    data: {
      resumeId: resume.id,
      score: atsResult.score,
      feedback: atsResult.feedback,
      keywordsMatched: matched,
      keywordsMissing: missing.slice(0, 12),
      keywords: { matched, missing } as object,
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
    keywordsMatched: matched,
    keywordsMissing: missing,
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
  const { matched, missing } = computeKeywordMatch(data, targetRole);

  const atsAgent = AgentFactory.create("ats-agent");
  const ats = await atsAgent.run({ data }, { userId });
  const atsResult = ats.result as { score: number; feedback: string[] };

  const analysisAgent = AgentFactory.create("resume-analysis");
  const analysisOut = await analysisAgent.run(
    { data, atsScore: atsResult.score, targetRole },
    { userId }
  );
  const result = analysisOut.result as {
    analysis: string;
    score: number;
    strengths: string[];
    gaps: string[];
    keywordSuggestions: string[];
    atsTips: string[];
    source: string;
  };

  const record = await prisma.resumeAnalysisRecord.create({
    data: {
      userId,
      resumeId: resumeId || null,
      atsScore: atsResult.score,
      keywordsMatched: matched,
      keywordsMissing: missing.slice(0, 12),
      strengths: result.strengths,
      weaknesses: result.gaps,
      recommendations: result.atsTips,
      summary: result.analysis,
      atsTips: result.atsTips,
      keywordSuggestions: result.keywordSuggestions,
      source: `heuristic-ats+${result.source}`,
      raw: result as object,
    },
  });

  if (resumeId) {
    await prisma.atsScore.create({
      data: {
        resumeId,
        score: atsResult.score,
        feedback: atsResult.feedback,
        keywordsMatched: matched,
        keywordsMissing: missing.slice(0, 12),
        keywords: { analysis: result, matched, missing } as object,
      },
    });
  }

  return {
    id: record.id,
    atsScore: atsResult.score,
    keywordsMatched: matched,
    keywordsMissing: missing,
    strengths: result.strengths,
    weaknesses: result.gaps,
    recommendations: result.atsTips,
    keywordSuggestions: result.keywordSuggestions,
    summary: result.analysis,
    atsTips: result.atsTips,
    source: record.source,
    heuristicScore: atsResult.score,
  };
}

export async function getLatestAnalysis(userId: string, resumeId?: string) {
  return prisma.resumeAnalysisRecord.findFirst({
    where: { userId, ...(resumeId ? { resumeId } : {}) },
    orderBy: { createdAt: "desc" },
  });
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
