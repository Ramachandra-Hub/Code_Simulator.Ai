import { prisma } from "../../core/db/prisma";
import { encryptToken, decryptToken } from "../../lib/token-crypto";
import { agentEventBus } from "../../core/events/agent-event-bus";
import { githubClient } from "../integrations/github-client";
import { linkedinClient } from "../integrations/linkedin-client";
import { leetcodeClient } from "../integrations/leetcode-client";
import { hackerrankClient } from "../integrations/hackerrank-client";
import {
  analyzeGitHubProfile,
  analyzeLinkedInProfile,
  analyzeLeetCodeStats,
  analyzeHackerRankProfile,
  computeProfessionalReadiness,
} from "../evaluators/professional-profile-evaluator";
import { ensureDigitalTwin } from "../memory/digital-twin";
import type { IntegrationProvider } from "@prisma/client";

export async function upsertIntegrationAccount(
  userId: string,
  provider: IntegrationProvider,
  data: { accessToken?: string; refreshToken?: string; metadata?: Record<string, unknown> }
) {
  return prisma.integrationAccount.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      accessToken: data.accessToken ? encryptToken(data.accessToken) : undefined,
      refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : undefined,
      metadata: data.metadata as object,
      syncedAt: new Date(),
    },
    update: {
      accessToken: data.accessToken ? encryptToken(data.accessToken) : undefined,
      refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : undefined,
      metadata: data.metadata as object,
      syncedAt: new Date(),
    },
  });
}

export async function getDecryptedToken(userId: string, provider: IntegrationProvider): Promise<string | null> {
  const account = await prisma.integrationAccount.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!account?.accessToken) return null;
  try {
    return decryptToken(account.accessToken);
  } catch {
    return null;
  }
}

export async function syncGitHub(userId: string, username?: string) {
  const account = await prisma.integrationAccount.findUnique({
    where: { userId_provider: { userId, provider: "github" } },
  });
  const token = account?.accessToken ? await getDecryptedToken(userId, "github") : undefined;
  const meta = (account?.metadata as Record<string, string>) || {};
  const ghUser = username || meta.username;
  if (!ghUser) throw new Error("GitHub username required");

  const raw = await githubClient.fetchProfile(ghUser, token || undefined);
  const analysis = analyzeGitHubProfile(raw);

  await prisma.githubSnapshot.create({
    data: {
      userId,
      username: analysis.username,
      repos: analysis.repos as object,
      languages: analysis.languages as object,
      stars: analysis.totalStars,
      forks: analysis.totalForks,
      commits: analysis.totalCommits,
      score: analysis.score,
      analysis: analysis as object,
    },
  });

  await upsertIntegrationAccount(userId, "github", {
    metadata: { username: analysis.username, lastScore: analysis.score },
  });

  await agentEventBus.emit("github.synced", {
    userId,
    githubScore: analysis.score,
    totalRepos: analysis.publicRepos,
    totalStars: analysis.totalStars,
    score: analysis.score,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
  });

  return analysis;
}

export async function syncLinkedIn(userId: string) {
  const token = await getDecryptedToken(userId, "linkedin");
  if (!token) throw new Error("LinkedIn not connected — complete OAuth first");

  const raw = await linkedinClient.fetchProfile(token);
  const analysis = analyzeLinkedInProfile(raw);

  await prisma.linkedInSnapshot.create({
    data: {
      userId,
      headline: analysis.headline,
      experience: analysis.experience as object,
      skills: analysis.skills,
      projects: analysis.projects as object,
      certifications: analysis.certifications as object,
      recommendations: analysis.recommendations as object,
      score: analysis.score,
      analysis: analysis as object,
    },
  });

  await upsertIntegrationAccount(userId, "linkedin", {
    metadata: { lastScore: analysis.score },
  });

  await agentEventBus.emit("linkedin.synced", {
    userId,
    linkedinScore: analysis.score,
    score: analysis.score,
    skills: analysis.skills,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
  });

  return analysis;
}

export async function syncLeetCode(userId: string, username: string) {
  const raw = await leetcodeClient.fetchProfile(username);
  const analysis = analyzeLeetCodeStats({ ...raw, username });

  await prisma.leetCodeStats.create({
    data: {
      userId,
      username,
      solved: analysis.solved,
      easy: analysis.easy,
      medium: analysis.medium,
      hard: analysis.hard,
      ranking: analysis.ranking,
      contestRating: analysis.contestRating,
      topics: analysis.topics as object,
      score: analysis.score,
      analysis: analysis as object,
    },
  });

  await upsertIntegrationAccount(userId, "leetcode", {
    metadata: { username, lastScore: analysis.score },
  });

  await agentEventBus.emit("leetcode.synced", {
    userId,
    leetcodeScore: analysis.score,
    score: analysis.score,
    codingReadiness: analysis.codingReadiness,
    algorithmSkills: analysis.algorithmSkills,
    problemSolving: analysis.problemSolving,
    solved: analysis.solved,
  });

  return analysis;
}

export async function syncHackerRank(userId: string, username: string) {
  const raw = await hackerrankClient.fetchProfile(username);
  const analysis = analyzeHackerRankProfile({ ...raw, username });

  await prisma.hackerRankStats.create({
    data: {
      userId,
      username,
      badges: analysis.badges as object,
      certificates: analysis.certificates as object,
      skillLevels: analysis.skillLevels as object,
      score: analysis.score,
      analysis: analysis as object,
    },
  });

  await upsertIntegrationAccount(userId, "hackerrank", {
    metadata: { username, lastScore: analysis.score },
  });

  await agentEventBus.emit("hackerrank.synced", {
    userId,
    hackerrankScore: analysis.score,
    score: analysis.score,
  });

  return analysis;
}

export async function recomputeProfessionalScores(userId: string) {
  const profile = await ensureDigitalTwin(userId);
  const { professionalReadiness, portfolioStrength } = computeProfessionalReadiness({
    github: profile.githubScore,
    linkedin: profile.linkedinScore,
    leetcode: profile.leetcodeScore,
    hackerrank: profile.hackerrankScore,
  });

  return prisma.studentIntelligenceProfile.update({
    where: { userId },
    data: { professionalReadiness, portfolioStrength },
  });
}

export async function getIntegrationStatus(userId: string) {
  const accounts = await prisma.integrationAccount.findMany({ where: { userId } });
  const providers = ["github", "linkedin", "leetcode", "hackerrank"] as const;

  return Promise.all(
    providers.map(async (provider) => {
      const account = accounts.find((a) => a.provider === provider);
      const meta = (account?.metadata as Record<string, string>) || {};
      return {
        provider,
        connected: Boolean(account),
        username: meta.username,
        lastSynced: account?.syncedAt?.toISOString() || null,
        lastScore: meta.lastScore ? Number(meta.lastScore) : null,
      };
    })
  );
}
