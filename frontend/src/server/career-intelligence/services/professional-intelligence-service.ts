import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../memory/digital-twin";
import { getIntegrationStatus } from "./profile-integration-service";

export interface ProfessionalIntelligenceDashboard {
  scores: {
    githubScore: number;
    linkedinScore: number;
    codingScore: number;
    professionalReadiness: number;
    portfolioStrength: number;
    leetcodeScore: number;
    hackerrankScore: number;
  };
  integrations: Awaited<ReturnType<typeof getIntegrationStatus>>;
  github: {
    username?: string;
    totalRepos?: number;
    totalStars?: number;
    languages?: Record<string, number>;
    strengths?: string[];
    analyzedAt?: string;
  } | null;
  linkedin: {
    headline?: string;
    skills?: string[];
    certifications?: number;
    strengths?: string[];
    analyzedAt?: string;
  } | null;
  leetcode: {
    username?: string;
    solved?: number;
    easy?: number;
    medium?: number;
    hard?: number;
    contestRating?: number;
    topics?: Record<string, number>;
    syncedAt?: string;
  } | null;
  hackerrank: {
    username?: string;
    badges?: number;
    certificates?: number;
    skillLevels?: Record<string, number>;
    syncedAt?: string;
  } | null;
}

export async function getProfessionalIntelligenceDashboard(userId: string): Promise<ProfessionalIntelligenceDashboard> {
  const profile = await ensureDigitalTwin(userId);
  const [integrations, githubSnap, linkedinSnap, leetcodeStats, hackerrankStats] = await Promise.all([
    getIntegrationStatus(userId),
    prisma.githubSnapshot.findFirst({ where: { userId }, orderBy: { analyzedAt: "desc" } }),
    prisma.linkedInSnapshot.findFirst({ where: { userId }, orderBy: { analyzedAt: "desc" } }),
    prisma.leetCodeStats.findFirst({ where: { userId }, orderBy: { syncedAt: "desc" } }),
    prisma.hackerRankStats.findFirst({ where: { userId }, orderBy: { syncedAt: "desc" } }),
  ]);

  const githubAnalysis = githubSnap?.analysis as Record<string, unknown> | null;
  const linkedinAnalysis = linkedinSnap?.analysis as Record<string, unknown> | null;

  const codingScore = Math.round(
    (profile.leetcodeScore * 0.65 + profile.hackerrankScore * 0.35) ||
      (leetcodeStats?.score || 0) * 0.65 + (hackerrankStats?.score || 0) * 0.35
  );

  return {
    scores: {
      githubScore: profile.githubScore,
      linkedinScore: profile.linkedinScore,
      codingScore,
      professionalReadiness: profile.professionalReadiness,
      portfolioStrength: profile.portfolioStrength,
      leetcodeScore: profile.leetcodeScore,
      hackerrankScore: profile.hackerrankScore,
    },
    integrations,
    github: githubSnap
      ? {
          username: githubSnap.username || undefined,
          totalRepos: (githubAnalysis?.publicRepos as number) || undefined,
          totalStars: githubSnap.stars || undefined,
          languages: (githubSnap.languages as Record<string, number>) || undefined,
          strengths: (githubAnalysis?.strengths as string[]) || undefined,
          analyzedAt: githubSnap.analyzedAt.toISOString(),
        }
      : null,
    linkedin: linkedinSnap
      ? {
          headline: linkedinSnap.headline || undefined,
          skills: linkedinSnap.skills,
          certifications: linkedinSnap.certifications
            ? Array.isArray(linkedinSnap.certifications)
              ? linkedinSnap.certifications.length
              : Object.keys(linkedinSnap.certifications as object).length
            : 0,
          strengths: (linkedinAnalysis?.strengths as string[]) || undefined,
          analyzedAt: linkedinSnap.analyzedAt.toISOString(),
        }
      : null,
    leetcode: leetcodeStats
      ? {
          username: leetcodeStats.username || undefined,
          solved: leetcodeStats.solved,
          easy: leetcodeStats.easy,
          medium: leetcodeStats.medium,
          hard: leetcodeStats.hard,
          contestRating: leetcodeStats.contestRating || undefined,
          topics: (leetcodeStats.topics as Record<string, number>) || undefined,
          syncedAt: leetcodeStats.syncedAt.toISOString(),
        }
      : null,
    hackerrank: hackerrankStats
      ? {
          username: hackerrankStats.username || undefined,
          badges: Array.isArray(hackerrankStats.badges) ? (hackerrankStats.badges as unknown[]).length : 0,
          certificates: Array.isArray(hackerrankStats.certificates)
            ? (hackerrankStats.certificates as unknown[]).length
            : 0,
          skillLevels: (hackerrankStats.skillLevels as Record<string, number>) || undefined,
          syncedAt: hackerrankStats.syncedAt.toISOString(),
        }
      : null,
  };
}
