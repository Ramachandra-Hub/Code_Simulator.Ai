async function osFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
  return res.json();
}

export const careerOsApi = {
  overview: () => osFetch<Record<string, unknown>>("/api/career-os/overview"),
  generateMissions: () => osFetch<Record<string, unknown>>("/api/career-os/missions/generate", { method: "POST" }),
  missions: () => osFetch<Record<string, unknown>>("/api/missions"),
  goals: () => osFetch<{ goals: unknown[]; templates: unknown[] }>("/api/goals"),
  createGoal: (data: { templateId?: string; customTitle?: string; targetRole?: string }) =>
    osFetch<Record<string, unknown>>("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  habits: () => osFetch<Record<string, unknown>>("/api/career-os/habits"),
  logHabit: (habitType: string) =>
    osFetch<Record<string, unknown>>("/api/career-os/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habitType }) }),
  progress: () => osFetch<{ history: unknown[] }>("/api/career-os/progress"),
  predictions: () => osFetch<{ predictions: unknown[] }>("/api/predictions"),
  velocity: () => osFetch<Record<string, unknown>>("/api/velocity"),
  potential: () => osFetch<Record<string, unknown>>("/api/potential"),
  achievements: () => osFetch<{ achievements: unknown[] }>("/api/career-os/achievements"),
};
