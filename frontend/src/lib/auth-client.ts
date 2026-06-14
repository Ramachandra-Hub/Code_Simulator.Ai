import type { UserRole } from "./types";
import { apiFetch, setAuthToken, clearAuthToken } from "./api-client";

export interface AuthSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

const SESSION_KEY = "nexusedge_session";

export async function loginWithCredentials(email: string, password: string): Promise<AuthSession> {
  const result = await apiFetch<{ user: AuthSession; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(result.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
  return result.user;
}

export async function loginAsDemo(role: UserRole): Promise<AuthSession> {
  const result = await apiFetch<{ user: AuthSession; token: string }>("/auth/demo", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  setAuthToken(result.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
  return result.user;
}

export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const result = await apiFetch<{ user: AuthSession }>("/auth/me");
    localStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
    return result.user;
  } catch {
    return null;
  }
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  clearAuthToken();
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("nexusedge_profile");
  if (typeof window !== "undefined") window.location.href = "/login";
}
