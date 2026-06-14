async function talentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export interface CandidateIntel {
  userId: string;
  name: string;
  email: string;
  college: string | null;
  targetRole: string | null;
  resumeScore: number;
  atsScore: number;
  technicalScore: number;
  codingScore: number;
  communicationScore: number;
  confidenceScore: number;
  panelReadiness: number;
  placementReadiness: number;
  githubScore: number;
  linkedinScore: number;
  leetcodeScore: number;
  hackerrankScore: number;
  professionalReadiness: number;
  growthPotentialScore: number;
  growthTier: string;
  careerVelocityScore: number;
  careerVelocityTrend: string;
  learningVelocity: number;
  digitalTwinSummary: {
    strengths: string[];
    weaknesses: string[];
    placementScore: number;
    executiveCommunication: number;
    stakeholderManagement: number;
    pressureHandling: number;
  };
  hiring?: {
    decision: string;
    confidence: number;
    reasoning: string;
    highlights: string[];
    risks: string[];
  };
  interviewPlan?: Record<string, unknown>;
}

export const talentApi = {
  overview: () => talentFetch<Record<string, unknown>>("/api/recruiter/overview"),
  candidates: () => talentFetch<{ candidates: CandidateIntel[] }>("/api/recruiter/candidates"),
  candidate: (id: string) => talentFetch<CandidateIntel>(`/api/recruiter/candidates/${id}`),
  radar: () => talentFetch<{ radar: Array<{ category: string; title: string; candidates: CandidateIntel[] }> }>("/api/talent/radar"),
  copilot: (query: string) =>
    talentFetch<{ answer: string; candidates: CandidateIntel[]; query: string }>("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }),
  jobs: () => talentFetch<{ jobs: Array<Record<string, unknown>> }>("/api/jobs"),
  createJob: (data: { title: string; description: string; skills?: string[]; location?: string }) =>
    talentFetch<Record<string, unknown>>("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  matchJob: (jobId: string) =>
    talentFetch<{ matches: unknown[] }>(`/api/jobs/${jobId}/match`, { method: "POST" }),
  shortlists: () => talentFetch<{ shortlists: Array<Record<string, unknown>> }>("/api/recruiter/shortlists"),
  shortlist: (data: { candidateId: string; jobId?: string; status?: string; notes?: string; generatePlan?: boolean }) =>
    talentFetch<Record<string, unknown>>("/api/recruiter/shortlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  analytics: () => talentFetch<Record<string, unknown>>("/api/recruiter/analytics"),
};
