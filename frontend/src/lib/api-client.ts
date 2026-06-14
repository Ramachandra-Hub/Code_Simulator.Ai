// Browser: always same-origin `/api` (works on any dev port). SSR may use env override.
const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nexusedge_token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || "Request failed");
  }
  return res.json();
}

export function setAuthToken(token: string): void {
  localStorage.setItem("nexusedge_token", token);
}

export function clearAuthToken(): void {
  localStorage.removeItem("nexusedge_token");
}

export function isApiAvailable(): boolean {
  return typeof window !== "undefined";
}
