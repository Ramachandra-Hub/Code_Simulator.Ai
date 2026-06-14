import { demoUsers } from "./mock-data";
import type { User, UserRole } from "./types";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  address: string;
  city: string;
  state: string;
  country: string;
  institution: string;
  department: string;
  branch: string;
  batch: string;
  rollNumber: string;
  graduationYear: string;
  cgpa: string;
  skills: string;
  careerGoal: string;
  linkedin: string;
  github: string;
  leetcode: string;
  codechef: string;
  geeksforgeeks: string;
  hackerrank: string;
  portfolio: string;
  twitter: string;
}

const PROFILE_KEY = "nexusedge_profile";

export function getStoredRole(): UserRole {
  if (typeof window === "undefined") return "student";
  try {
    const raw = localStorage.getItem("nexusedge_session");
    if (raw) {
      const session = JSON.parse(raw) as { role?: UserRole };
      if (session.role && demoUsers[session.role]) return session.role;
    }
  } catch {
    // ignore
  }
  return "student";
}

export function getDefaultProfile(role: UserRole): UserProfile {
  const base = demoUsers[role] || demoUsers.student;
  return {
    name: base.name,
    email: base.email,
    phone: "",
    dateOfBirth: "",
    gender: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    institution: base.institution || "",
    department: base.department || "",
    branch: base.department || "",
    batch: "2026",
    rollNumber: "",
    graduationYear: "2026",
    cgpa: "",
    skills: "JavaScript, Python, React, DSA",
    careerGoal: "",
    linkedin: "",
    github: "",
    leetcode: "",
    codechef: "",
    geeksforgeeks: "",
    hackerrank: "",
    portfolio: "",
    twitter: "",
  };
}

export function getProfile(role?: UserRole): UserProfile {
  const currentRole = role ?? getStoredRole();
  const defaults = getDefaultProfile(currentRole);

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(`${PROFILE_KEY}_${currentRole}`);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function saveProfile(role: UserRole, profile: UserProfile): void {
  localStorage.setItem(`${PROFILE_KEY}_${role}`, JSON.stringify(profile));
}

export function getCurrentUser(role?: UserRole): User {
  const currentRole = role ?? getStoredRole();
  const base = demoUsers[currentRole] || demoUsers.student;
  const profile = getProfile(currentRole);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    ...base,
    name: profile.name || base.name,
    email: profile.email || base.email,
    institution: profile.institution || base.institution,
    department: profile.department || base.department,
    avatar: initials || base.avatar,
  };
}

export function logout(): void {
  window.location.href = "/login";
}
