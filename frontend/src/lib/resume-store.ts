import type { ResumeData } from "./resume-types";
import { getProfile } from "./profile";
import { apiFetch } from "./api-client";

export function createEmptyResume(): ResumeData {
  const profile = typeof window !== "undefined" ? getProfile() : null;
  const p = profile || {
    name: "",
    email: "",
    phone: "",
    institution: "",
    department: "Computer Science",
    skills: "",
    linkedin: "",
    github: "",
    careerGoal: "Software Engineer",
  };

  return {
    id: "",
    name: p.name,
    email: p.email,
    phone: p.phone || "",
    location: "",
    title: p.careerGoal || "Software Engineer",
    targetRole: p.careerGoal || "Software Engineer",
    summary: "",
    education: [
      {
        institution: p.institution || "",
        degree: "B.Tech",
        field: p.department || "Computer Science",
        startYear: "2022",
        endYear: ("graduationYear" in p ? p.graduationYear : undefined) || "2026",
        cgpa: ("cgpa" in p ? p.cgpa : undefined) || "",
      },
    ],
    experience: [],
    projects: [],
    skills: p.skills.split(",").map((s) => s.trim()).filter(Boolean),
    certifications: [],
    linkedin: p.linkedin || "",
    github: p.github || "",
    atsScore: 0,
    atsFeedback: [],
    aiEnhanced: false,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchResumesAsync(): Promise<ResumeData[]> {
  const resumes = await apiFetch<Record<string, unknown>[]>("/resume");
  return resumes.map(mapDbResume);
}

export async function saveResumeAsync(resume: ResumeData, resumeId?: string): Promise<ResumeData> {
  const payload = { ...resume, id: undefined };
  const saved = await apiFetch<Record<string, unknown>>("/resume", {
    method: "POST",
    body: JSON.stringify({ ...payload, resumeId: resumeId || resume.id || undefined }),
  });
  return mapDbResume(saved);
}

export async function getActiveResumeAsync(): Promise<ResumeData | null> {
  const resumes = await fetchResumesAsync();
  return resumes.find((r) => r.isActive) || resumes[0] || null;
}

export async function setActiveResumeAsync(resumeId: string): Promise<void> {
  await apiFetch(`/resume/${resumeId}/active`, { method: "PATCH" });
}

export async function analyzeResumeAsync(data: ResumeData, resumeId?: string) {
  return apiFetch<Record<string, unknown>>("/resume/analysis", {
    method: "POST",
    body: JSON.stringify({ data, resumeId: resumeId || data.id || undefined }),
  });
}

export async function fetchLatestAnalysisAsync(resumeId?: string) {
  const q = resumeId ? `?resumeId=${resumeId}` : "";
  return apiFetch<Record<string, unknown> | null>(`/resume/analysis${q}`);
}

export async function uploadResumeFileAsync(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/resume/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json as {
    resume: Record<string, unknown>;
    analysis: Record<string, unknown>;
    extractedChars: number;
    fileName: string;
  };
}

function mapDbResume(r: Record<string, unknown>): ResumeData {
  const data = (r.data as ResumeData) || r;
  const ats = (r.atsScores as Array<{
    score: number;
    feedback: string[];
    keywordsMatched?: string[];
    keywordsMissing?: string[];
  }>)?.[0];
  return {
    id: (r.id as string) || (data.id as string),
    name: (r.name as string) || data.name,
    email: (r.email as string) || data.email,
    phone: (r.phone as string) || data.phone || "",
    location: (r.location as string) || data.location || "",
    title: (r.title as string) || data.title,
    targetRole: (r.targetRole as string) || data.targetRole,
    summary: (r.summary as string) || data.summary || "",
    education: data.education || [],
    experience: data.experience || [],
    projects: data.projects || [],
    skills: data.skills || [],
    certifications: data.certifications || [],
    linkedin: data.linkedin || "",
    github: data.github || "",
    atsScore: ats?.score || (r.atsScore as number) || data.atsScore || 0,
    atsFeedback: ats?.feedback || data.atsFeedback || [],
    keywordsMatched: ats?.keywordsMatched || data.keywordsMatched || [],
    keywordsMissing: ats?.keywordsMissing || data.keywordsMissing || [],
    aiEnhanced: (r.aiEnhanced as boolean) ?? data.aiEnhanced ?? false,
    isActive: (r.isActive as boolean) ?? false,
    createdAt: (r.createdAt as string) || data.createdAt || new Date().toISOString(),
    updatedAt: (r.updatedAt as string) || data.updatedAt || new Date().toISOString(),
  };
}

export function generateAISummary(resume: ResumeData): string {
  const skills = resume.skills.slice(0, 6).join(", ");
  const edu = resume.education[0];
  const project = resume.projects[0]?.name;
  return `${resume.targetRole} candidate pursuing ${edu?.degree || "a degree"} in ${edu?.field || "Computer Science"} at ${edu?.institution || "a leading institution"}. Proficient in ${skills || "modern software development"}.${project ? ` Built ${project} demonstrating practical engineering skills.` : ""} Seeking opportunities to apply strong problem-solving abilities and deliver impactful solutions.`;
}

export function generateAIProjectBullets(role: string): string {
  const map: Record<string, string> = {
    "Software Engineer": "Designed and implemented REST APIs serving 10K+ requests/day with 99.9% uptime using Node.js and PostgreSQL.",
    "Data Scientist": "Built predictive model achieving 92% accuracy on classification task using scikit-learn and feature engineering.",
    "AI Engineer": "Developed RAG pipeline integrating LLM with vector database, reducing response latency by 40%.",
    "Full Stack Developer": "Created responsive web application with React frontend and Express backend, deployed on AWS.",
  };
  return map[role] || map["Software Engineer"];
}
