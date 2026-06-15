import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../memory/digital-twin";

const TRIGGER_LABELS: Record<string, string> = {
  "interview.completed": "Mock interview completed",
  "resume.updated": "Resume updated",
  "coding-os": "Coding practice",
  "coding.submitted": "Code submitted",
  "coding.interview.completed": "Coding interview round",
  "panel.completed": "Panel interview completed",
  "github.synced": "GitHub profile synced",
  "linkedin.synced": "LinkedIn profile synced",
  "leetcode.synced": "LeetCode stats synced",
  "hackerrank.synced": "HackerRank stats synced",
  "digital-twin.recompute": "Readiness recalculated",
  "career-coach": "Career coach session",
  "voice-interview": "Voice interview",
};

export interface TwinActivityItem {
  id: string;
  label: string;
  trigger: string;
  at: string;
  summary?: string;
}

export async function getTwinActivityFeed(userId: string, limit = 8): Promise<TwinActivityItem[]> {
  const profile = await ensureDigitalTwin(userId);
  const snapshots = await prisma.digitalTwinSnapshot.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return snapshots.map((s) => {
    const data = s.data as Record<string, unknown>;
    const derived = data.derivedUpdates as Record<string, unknown> | undefined;
    const placement = derived?.placementScore;
    const trigger = s.trigger || "activity";
    let summary: string | undefined;
    if (typeof placement === "number") summary = `Placement score now ${placement}%`;
    else if (typeof data.atsScore === "number") summary = `ATS ${data.atsScore}/100`;
    else if (typeof data.codingReadiness === "number") summary = `Coding readiness ${data.codingReadiness}%`;
    else if (typeof data.problemsSolved === "number") summary = `${data.problemsSolved} problems solved`;

    return {
      id: s.id,
      label: TRIGGER_LABELS[trigger] || trigger.replace(/[._]/g, " "),
      trigger,
      at: s.createdAt.toISOString(),
      summary,
    };
  });
}

export async function getReadinessDelta(userId: string): Promise<{
  current: number;
  previous: number | null;
  delta: number;
  trend: "up" | "down" | "flat";
}> {
  const [profile, history] = await Promise.all([
    ensureDigitalTwin(userId),
    prisma.placementReadiness.findMany({
      where: { userId },
      orderBy: { computedAt: "desc" },
      take: 2,
    }),
  ]);

  const current = history[0]?.overallScore ?? Math.round(profile.placementScore);
  const previous = history[1]?.overallScore ?? null;
  const delta = previous != null ? current - previous : 0;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return { current, previous, delta, trend };
}

export function buildPersonalizedCoachMessage(input: {
  name?: string;
  targetRole: string;
  placementReadiness: number;
  readinessDelta: number;
  weaknesses: string[];
  strengths: string[];
  lastInterviewType?: string | null;
  problemsSolved?: number;
  weakTopics?: string[];
}): string {
  const first = input.name?.split(" ")[0] || "there";
  const weak = input.weaknesses[0] || input.weakTopics?.[0];
  const strong = input.strengths[0];

  if (input.readinessDelta > 2) {
    return `Good momentum, ${first}. Your placement readiness moved up ${input.readinessDelta} points to ${input.placementReadiness}%. Keep pressure on ${weak || "your weakest skill area"} while maintaining ${strong || "what is already working"}.`;
  }

  if (input.placementReadiness < 50) {
    return `${first}, you're at ${input.placementReadiness}% readiness for ${input.targetRole}. Priority this week: fix ${weak || "resume keywords"}, then one mock interview and 3 coding problems in ${input.weakTopics?.[0] || "arrays"}.`;
  }

  if (input.lastInterviewType) {
    return `Welcome back, ${first}. After your ${input.lastInterviewType.replace(/_/g, " ")} session, focus on ${weak || "communication depth"} and ${input.problemsSolved ? `push past ${input.problemsSolved} solved problems` : "one more coding session"} before your next drive.`;
  }

  return `${first}, you're ${input.placementReadiness}% placement-ready for ${input.targetRole}. ${strong ? `Strength: ${strong}.` : ""} Next: ${weak ? `shore up ${weak}` : "run a company-specific mock"} and update your twin with real practice.`;
}

export async function getNextBestActions(userId: string) {
  const [twin, resume, acceptedCount, dsaWeak, lastInterview] = await Promise.all([
    ensureDigitalTwin(userId),
    prisma.resume.findFirst({ where: { userId, isActive: true }, include: { atsScores: { take: 1, orderBy: { createdAt: "desc" } } } }),
    prisma.codeProblemSubmission.count({ where: { userId, verdict: "accepted" } }),
    prisma.dsaTopicProgress.findMany({ where: { userId, weakArea: true }, include: { topic: true }, take: 3 }),
    prisma.interviewSession.findFirst({ where: { userId, status: "completed" }, orderBy: { completedAt: "desc" } }),
  ]);

  const actions: Array<{ title: string; href: string; priority: "high" | "medium" }> = [];
  const ats = resume?.atsScores[0]?.score ?? 0;

  if (!resume || ats < 60) {
    actions.push({ title: "Upload or improve resume for ATS", href: "/career-os?tab=ats", priority: "high" });
  }
  if (acceptedCount < 5) {
    actions.push({ title: "Solve 3 Coding OS problems", href: "/coding-os?tab=practice", priority: "high" });
  }
  if (dsaWeak.length) {
    actions.push({
      title: `Practice ${dsaWeak[0].topic.name} (weak area)`,
      href: "/coding-os?tab=dsa",
      priority: "medium",
    });
  }
  if (!lastInterview || Date.now() - (lastInterview.completedAt?.getTime() || 0) > 7 * 86400000) {
    actions.push({ title: "Book a mock interview", href: "/interview?tab=mock", priority: "high" });
  }
  if (twin.panelReadiness < 55) {
    actions.push({ title: "Try panel interview practice", href: "/interview?tab=panel", priority: "medium" });
  }
  if (actions.length < 3) {
    actions.push({ title: "Run company placement mock", href: "/interview?tab=placement", priority: "medium" });
  }

  return actions.slice(0, 4);
}
