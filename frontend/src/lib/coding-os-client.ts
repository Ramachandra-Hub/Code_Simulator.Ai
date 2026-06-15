import { apiFetch } from "./api-client";

export const codingOsApi = {
  overview: () => apiFetch<Record<string, unknown>>("/coding-os/overview"),
  problems: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return apiFetch<{ problems: unknown[] }>(`/coding-os/problems${q}`);
  },
  problem: (id: string) => apiFetch<Record<string, unknown>>(`/coding-os/problems/${id}`),
  generateProblem: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/coding-os/problems/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  run: (problemId: string, body: { code: string; language: string; stdin?: string }) =>
    apiFetch<Record<string, unknown>>(`/coding-os/problems/${problemId}/run`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submit: (problemId: string, body: { code: string; language: string }) =>
    apiFetch<Record<string, unknown>>(`/coding-os/problems/${problemId}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  dsa: () => apiFetch<Record<string, unknown>>("/coding-os/dsa"),
  analytics: () => apiFetch<Record<string, unknown>>("/coding-os/analytics"),
  history: () => apiFetch<Record<string, unknown>>("/coding-os/history"),
  contests: () => apiFetch<{ contests: unknown[] }>("/coding-os/contests"),
  assignments: () => apiFetch<{ assignments: unknown[] }>("/coding-os/assignments"),
  mcq: () => apiFetch<{ questions: unknown[] }>("/coding-os/mcq"),
  sql: () => apiFetch<{ datasets: unknown[] }>("/coding-os/sql"),
  mentor: (body: { message: string; problemId?: string }) =>
    apiFetch<Record<string, unknown>>("/coding-os/mentor", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
