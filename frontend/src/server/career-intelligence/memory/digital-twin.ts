import { prisma } from "../../core/db/prisma";
import { agentEventBus } from "../../core/events/agent-event-bus";
import { agentMemory } from "../../core/memory/agent-memory";
import { computeProfessionalReadiness } from "../evaluators/professional-profile-evaluator";
import type { StudentIntelligenceProfile } from "@prisma/client";

export async function ensureDigitalTwin(userId: string): Promise<StudentIntelligenceProfile> {
  return prisma.studentIntelligenceProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

interface TwinSignal {
  type: string;
  source: string;
  data: Record<string, unknown>;
}

function ema(prev: number, next: number, alpha = 0.4): number {
  if (!prev) return next;
  return Math.round((prev * (1 - alpha) + next * alpha) * 100) / 100;
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).slice(0, 12);
}

function deriveUpdates(signal: TwinSignal, profile: StudentIntelligenceProfile) {
  const update: Partial<{
    interviewReadiness: number;
    codingReadiness: number;
    algorithmSkills: number;
    problemSolving: number;
    optimizationSkills: number;
    communicationScore: number;
    confidenceScore: number;
    speakingSkills: number;
    technicalScore: number;
    githubScore: number;
    linkedinScore: number;
    leetcodeScore: number;
    hackerrankScore: number;
    professionalReadiness: number;
    portfolioStrength: number;
    executiveCommunication: number;
    stakeholderManagement: number;
    pressureHandling: number;
    panelReadiness: number;
    leadershipScore: number;
    ownershipScore: number;
    collaborationScore: number;
    promotionReadiness: number;
    placementScore: number;
    strengths: string[];
    weaknesses: string[];
  }> = {};
  const data = signal.data;

  if (signal.type === "voice") {
    const comm = data.communicationScore as number | undefined;
    const conf = data.confidenceScore as number | undefined;
    const speaking = data.speakingSkills as number | undefined;
    if (typeof comm === "number") update.communicationScore = ema(profile.communicationScore, comm);
    if (typeof conf === "number") update.confidenceScore = ema(profile.confidenceScore, conf);
    if (typeof speaking === "number") update.speakingSkills = ema(profile.speakingSkills, speaking);
    if (typeof data.interviewReadiness === "number") {
      update.interviewReadiness = ema(profile.interviewReadiness, data.interviewReadiness as number);
    }
  }

  if (signal.type === "interview") {
    const scores = (data.scores as Record<string, number>) || {};
    if (typeof scores.overall === "number") update.interviewReadiness = ema(profile.interviewReadiness, scores.overall);
    if (typeof scores.communication === "number") update.communicationScore = ema(profile.communicationScore, scores.communication);
    if (typeof scores.technicalKnowledge === "number") update.technicalScore = ema(profile.technicalScore, scores.technicalKnowledge);
    update.strengths = uniq([...(profile.strengths || []), ...((data.strengths as string[]) || [])]);
    update.weaknesses = uniq([...(profile.weaknesses || []), ...((data.weaknesses as string[]) || [])]);
  }

  if (signal.type === "coding") {
    const score = (data.score as number) ?? (data.codingReadiness as number);
    const passed = data.passed as boolean | undefined;
    const codingScore = typeof score === "number" ? score : passed ? 80 : 50;

    update.codingReadiness = ema(profile.codingReadiness, codingScore);

    const algo = (data.algorithmSkills as number) ?? codingScore;
    const problem = (data.problemSolving as number) ?? codingScore;
    const optim = (data.optimizationSkills as number) ?? codingScore;

    update.algorithmSkills = ema(profile.algorithmSkills, algo);
    update.problemSolving = ema(profile.problemSolving, problem);
    update.optimizationSkills = ema(profile.optimizationSkills, optim);
    update.technicalScore = ema(profile.technicalScore, Math.round((algo + problem) / 2));
  }

  if (signal.type === "resume") {
    const atsScore = (data.atsScore as number) || (data.score as number);
    if (typeof atsScore === "number") {
      update.technicalScore = ema(profile.technicalScore, atsScore * 0.6 + 40);
    }
  }

  if (signal.type === "exam" || signal.type === "assignment") {
    const score = (data.score as number) || (data.grade as number);
    if (typeof score === "number") {
      update.technicalScore = ema(profile.technicalScore, score);
    }
  }

  if (signal.type === "github") {
    const ghScore = (data.githubScore as number) ?? (data.score as number) ?? 0;
    update.githubScore = ema(profile.githubScore, ghScore);
    update.technicalScore = ema(profile.technicalScore, Math.min(100, ghScore * 0.7 + 20));
    update.strengths = uniq([...(profile.strengths || []), ...((data.strengths as string[]) || [])]);
    update.weaknesses = uniq([...(profile.weaknesses || []), ...((data.weaknesses as string[]) || [])]);
  }

  if (signal.type === "linkedin") {
    const liScore = (data.linkedinScore as number) ?? (data.score as number) ?? 0;
    update.linkedinScore = ema(profile.linkedinScore, liScore);
    update.communicationScore = ema(profile.communicationScore, Math.min(100, liScore * 0.6 + 30));
    update.strengths = uniq([...(profile.strengths || []), ...((data.strengths as string[]) || [])]);
    update.weaknesses = uniq([...(profile.weaknesses || []), ...((data.weaknesses as string[]) || [])]);
  }

  if (signal.type === "leetcode") {
    const lcScore = (data.leetcodeScore as number) ?? (data.score as number) ?? 0;
    update.leetcodeScore = ema(profile.leetcodeScore, lcScore);
    if (typeof data.codingReadiness === "number") {
      update.codingReadiness = ema(profile.codingReadiness, data.codingReadiness as number);
    }
    if (typeof data.algorithmSkills === "number") {
      update.algorithmSkills = ema(profile.algorithmSkills, data.algorithmSkills as number);
    }
    if (typeof data.problemSolving === "number") {
      update.problemSolving = ema(profile.problemSolving, data.problemSolving as number);
    }
    update.technicalScore = ema(
      profile.technicalScore,
      Math.round(((data.algorithmSkills as number) || lcScore) * 0.5 + ((data.problemSolving as number) || lcScore) * 0.5)
    );
  }

  if (signal.type === "hackerrank") {
    const hrScore = (data.hackerrankScore as number) ?? (data.score as number) ?? 0;
    update.hackerrankScore = ema(profile.hackerrankScore, hrScore);
    update.codingReadiness = ema(profile.codingReadiness, hrScore * 0.85);
  }

  if (signal.type === "office") {
    if (typeof data.leadershipScore === "number") {
      update.leadershipScore = ema(profile.leadershipScore, data.leadershipScore as number);
    }
    if (typeof data.ownershipScore === "number") {
      update.ownershipScore = ema(profile.ownershipScore, data.ownershipScore as number);
    }
    if (typeof data.collaborationScore === "number") {
      update.collaborationScore = ema(profile.collaborationScore, data.collaborationScore as number);
    }
    if (typeof data.stakeholderManagement === "number") {
      update.stakeholderManagement = ema(profile.stakeholderManagement, data.stakeholderManagement as number);
    }
    if (typeof data.promotionReadiness === "number") {
      update.promotionReadiness = ema(profile.promotionReadiness, data.promotionReadiness as number);
    }
    if (typeof data.communicationScore === "number") {
      update.communicationScore = ema(profile.communicationScore, data.communicationScore as number);
    }
    if (typeof data.technicalScore === "number") {
      update.technicalScore = ema(profile.technicalScore, data.technicalScore as number);
    }
    update.strengths = uniq([...(profile.strengths || []), ...((data.strengths as string[]) || [])]);
    update.weaknesses = uniq([...(profile.weaknesses || []), ...((data.weaknesses as string[]) || [])]);
  }

  if (signal.type === "panel") {
    if (typeof data.executiveCommunication === "number") {
      update.executiveCommunication = ema(profile.executiveCommunication, data.executiveCommunication as number);
      update.communicationScore = ema(profile.communicationScore, data.executiveCommunication as number);
    }
    if (typeof data.stakeholderManagement === "number") {
      update.stakeholderManagement = ema(profile.stakeholderManagement, data.stakeholderManagement as number);
    }
    if (typeof data.pressureHandling === "number") {
      update.pressureHandling = ema(profile.pressureHandling, data.pressureHandling as number);
      update.confidenceScore = ema(profile.confidenceScore, data.pressureHandling as number);
    }
    if (typeof data.panelReadiness === "number") {
      update.panelReadiness = ema(profile.panelReadiness, data.panelReadiness as number);
      update.interviewReadiness = ema(profile.interviewReadiness, data.panelReadiness as number);
    }
    update.strengths = uniq([...(profile.strengths || []), ...((data.strengths as string[]) || [])]);
    update.weaknesses = uniq([...(profile.weaknesses || []), ...((data.weaknesses as string[]) || [])]);
  }

  const prof = computeProfessionalReadiness({
    github: update.githubScore ?? profile.githubScore,
    linkedin: update.linkedinScore ?? profile.linkedinScore,
    leetcode: update.leetcodeScore ?? profile.leetcodeScore,
    hackerrank: update.hackerrankScore ?? profile.hackerrankScore,
  });
  update.professionalReadiness = prof.professionalReadiness;
  update.portfolioStrength = prof.portfolioStrength;

  const newInterview = update.interviewReadiness ?? profile.interviewReadiness;
  const newCoding = update.codingReadiness ?? profile.codingReadiness;
  const newComms = update.communicationScore ?? profile.communicationScore;
  const newConf = update.confidenceScore ?? profile.confidenceScore;
  const newSpeaking = update.speakingSkills ?? profile.speakingSkills;
  const newTech = update.technicalScore ?? profile.technicalScore;
  const newProf = update.professionalReadiness ?? profile.professionalReadiness;
  const newPanel = update.panelReadiness ?? profile.panelReadiness;
  update.placementScore = Math.round(
    newInterview * 0.22 +
      newCoding * 0.18 +
      newTech * 0.16 +
      newComms * 0.1 +
      newConf * 0.06 +
      newSpeaking * 0.04 +
      newProf * 0.14 +
      newPanel * 0.1
  );

  return update;
}

export async function updateDigitalTwin(userId: string, signal: TwinSignal): Promise<StudentIntelligenceProfile> {
  const profile = await ensureDigitalTwin(userId);
  const updates = deriveUpdates(signal, profile);

  await prisma.skillSignal.create({
    data: {
      profileId: profile.id,
      skill: signal.type,
      level: typeof signal.data.score === "number" ? (signal.data.score as number) : updates.placementScore || 50,
      source: signal.source,
      evidence: JSON.stringify(signal.data).slice(0, 4000),
    },
  });

  await prisma.digitalTwinSnapshot.create({
    data: {
      profileId: profile.id,
      trigger: signal.source,
      data: { ...signal.data, derivedUpdates: updates } as object,
    },
  });

  const updated = await prisma.studentIntelligenceProfile.update({
    where: { userId },
    data: { ...updates, updatedAt: new Date() },
  });

  try {
    await agentMemory.storeSemantic(
      userId,
      `${signal.source}: ${JSON.stringify(signal.data).slice(0, 400)}`,
      { source: signal.source, type: signal.type }
    );
  } catch {
    // qdrant optional
  }

  await agentEventBus.emit("placement.recompute", { userId, profileId: profile.id });

  return updated;
}

export async function recomputePlacementReadiness(userId: string): Promise<void> {
  const { recordPlacementReadiness } = await import("../services/placement-readiness-service");
  await recordPlacementReadiness(userId, { source: "digital-twin.recompute" });
}

agentEventBus.on("interview.completed", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "interview", source: "interview.completed", data: payload });
  }
});

agentEventBus.on("resume.updated", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "resume", source: "resume.updated", data: payload });
  }
});

agentEventBus.on("assignment.submitted", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "assignment", source: "assignment.submitted", data: payload });
  }
});

agentEventBus.on("exam.completed", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "exam", source: "exam.completed", data: payload });
  }
});

agentEventBus.on("coding.submitted", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "coding", source: "coding.submitted", data: payload });
  }
});

agentEventBus.on("coding.interview.completed", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, {
      type: "coding",
      source: "coding.interview.completed",
      data: payload,
    });
  }
});

agentEventBus.on("github.synced", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "github", source: "github.synced", data: payload });
  }
});

agentEventBus.on("linkedin.synced", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "linkedin", source: "linkedin.synced", data: payload });
  }
});

agentEventBus.on("leetcode.synced", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "leetcode", source: "leetcode.synced", data: payload });
  }
});

agentEventBus.on("hackerrank.synced", async (payload) => {
  if (payload.userId) {
    await updateDigitalTwin(payload.userId as string, { type: "hackerrank", source: "hackerrank.synced", data: payload });
  }
});

agentEventBus.on("placement.recompute", async (payload) => {
  if (payload.userId) await recomputePlacementReadiness(payload.userId as string);
});
