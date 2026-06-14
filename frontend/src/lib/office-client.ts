async function officeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
  return res.json();
}

export const officeApi = {
  overview: () => officeFetch<Record<string, unknown>>("/api/office/overview"),
  work: () => officeFetch<Record<string, unknown>>("/api/office/work"),
  standups: () => officeFetch<{ standups: unknown[] }>("/api/office/standups"),
  submitStandup: (data: { yesterday: string; today: string; blockers?: string }) =>
    officeFetch<Record<string, unknown>>("/api/office/standups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  tasks: () => officeFetch<{ tasks: unknown[] }>("/api/office/tasks"),
  generateTasks: () => officeFetch<{ tasks: unknown[] }>("/api/office/tasks", { method: "POST" }),
  completeTask: (id: string) =>
    officeFetch<Record<string, unknown>>(`/api/office/tasks/${id}`, { method: "PATCH" }),
  meetings: () => officeFetch<{ meetings: unknown[] }>("/api/office/meetings"),
  scheduleMeeting: (type: string) =>
    officeFetch<Record<string, unknown>>("/api/office/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    }),
  completeMeeting: (id: string, data?: { transcript?: string; notes?: string }) =>
    officeFetch<Record<string, unknown>>(`/api/office/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    }),
  codeReviews: () => officeFetch<{ codeReviews: unknown[] }>("/api/office/code-reviews"),
  submitCodeReview: (data: { code: string; language?: string }) =>
    officeFetch<Record<string, unknown>>("/api/office/code-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  performance: () => officeFetch<{ reviews: unknown[] }>("/api/office/performance"),
  runPerformanceReview: (period: "weekly" | "monthly" = "weekly") =>
    officeFetch<Record<string, unknown>>("/api/office/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    }),
  promotion: () => officeFetch<{ assessments: unknown[] }>("/api/office/promotion"),
  runPromotionAssessment: () => officeFetch<Record<string, unknown>>("/api/office/promotion", { method: "POST" }),
  analytics: () => officeFetch<Record<string, unknown>>("/api/office/analytics"),
};
