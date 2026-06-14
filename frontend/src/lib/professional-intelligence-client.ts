import { apiFetch } from "./api-client";

export interface ProfessionalIntelligenceData {
  scores: {
    githubScore: number;
    linkedinScore: number;
    codingScore: number;
    professionalReadiness: number;
    portfolioStrength: number;
    leetcodeScore: number;
    hackerrankScore: number;
  };
  integrations: Array<{
    provider: string;
    connected: boolean;
    username?: string;
    lastSynced: string | null;
    lastScore: number | null;
  }>;
  github: Record<string, unknown> | null;
  linkedin: Record<string, unknown> | null;
  leetcode: Record<string, unknown> | null;
  hackerrank: Record<string, unknown> | null;
}

export async function getProfessionalIntelligence(): Promise<ProfessionalIntelligenceData> {
  return apiFetch<ProfessionalIntelligenceData>("/professional-intelligence");
}

export async function syncGitHub(username?: string) {
  return apiFetch("/integrations/github", { method: "POST", body: JSON.stringify({ username }) });
}

export async function syncLinkedIn() {
  return apiFetch("/integrations/linkedin", { method: "POST" });
}

export async function syncLeetCode(username: string) {
  return apiFetch("/integrations/leetcode", { method: "POST", body: JSON.stringify({ username }) });
}

export async function syncHackerRank(username: string) {
  return apiFetch("/integrations/hackerrank", { method: "POST", body: JSON.stringify({ username }) });
}

export function connectGitHubOAuth() {
  window.location.href = "/api/integrations/github/authorize";
}

export function connectLinkedInOAuth() {
  window.location.href = "/api/integrations/linkedin/authorize";
}
