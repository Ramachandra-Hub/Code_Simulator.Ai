import { z } from "zod";
import { llmPromptJson } from "../prompts/agent-llm";

const ParsedResumeSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  title: z.string().optional().default(""),
  targetRole: z.string().optional().default("Software Engineer"),
  summary: z.string().optional().default(""),
  skills: z.array(z.string()).default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string(),
        field: z.string().optional().default(""),
        startYear: z.string().optional().default(""),
        endYear: z.string().optional().default(""),
        cgpa: z.string().optional().default(""),
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
        startDate: z.string().optional().default(""),
        endDate: z.string().optional().default(""),
        description: z.string().optional().default(""),
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional().default(""),
        technologies: z.string().optional().default(""),
        link: z.string().optional().default(""),
      })
    )
    .default([]),
  certifications: z.array(z.string()).default([]),
  linkedin: z.string().optional().default(""),
  github: z.string().optional().default(""),
});

export type ParsedResumeData = z.infer<typeof ParsedResumeSchema>;

function extractEmail(text: string): string {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m?.[0] || "";
}

function extractPhone(text: string): string {
  const m = text.match(/(?:\+?\d{1,3}[-.\s]?)?\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/);
  return m?.[0] || "";
}

function extractLinkedIn(text: string): string {
  const m = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
  return m?.[0] || "";
}

function extractGithub(text: string): string {
  const m = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i);
  return m?.[0] || "";
}

function heuristicParse(text: string): ParsedResumeData {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const name = lines[0]?.slice(0, 80) || "Candidate";

  const skillsLine = lines.find((l) => /^skills?:/i.test(l));
  const skills = skillsLine
    ? skillsLine
        .replace(/^skills?:/i, "")
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 40)
    : [];

  return {
    name,
    email: extractEmail(text),
    phone: extractPhone(text),
    location: "",
    title: "",
    targetRole: "Software Engineer",
    summary: lines.slice(1, 4).join(" ").slice(0, 500),
    skills: skills.slice(0, 20),
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    linkedin: extractLinkedIn(text),
    github: extractGithub(text),
  };
}

export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text || "";
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  if (lower.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported — save as .docx or PDF");
  }
  return buffer.toString("utf8");
}

export async function parseResumeFromText(
  rawText: string,
  userId: string
): Promise<ParsedResumeData> {
  const trimmed = rawText.replace(/\s+/g, " ").trim();
  if (trimmed.length < 50) {
    throw new Error("Could not extract enough text from the file — try a text-based PDF or DOCX");
  }

  const fallback = heuristicParse(rawText);

  try {
    const { data, valid } = await llmPromptJson(
      "resume",
      "parse",
      {
        rawText: rawText.slice(0, 12000),
      },
      ParsedResumeSchema,
      fallback
    );

    if (valid && (data.email || data.name)) {
      return {
        ...fallback,
        ...data,
        email: data.email || fallback.email,
        phone: data.phone || fallback.phone,
        linkedin: data.linkedin || fallback.linkedin,
        github: data.github || fallback.github,
        skills: data.skills?.length ? data.skills : fallback.skills,
        education: (data.education || []).map((e) => ({
          institution: e.institution || "",
          degree: e.degree || "",
          field: e.field || "",
          startYear: e.startYear || "",
          endYear: e.endYear || "",
          cgpa: e.cgpa || "",
        })),
        experience: (data.experience || []).map((e) => ({
          company: e.company || "",
          role: e.role || "",
          startDate: e.startDate || "",
          endDate: e.endDate || "",
          description: e.description || "",
        })),
        projects: (data.projects || []).map((p) => ({
          name: p.name || "",
          description: p.description || "",
          technologies: p.technologies || "",
          link: p.link || "",
        })),
      };
    }
  } catch {
    // heuristic fallback
  }

  return fallback;
}

export function parsedToResumePayload(parsed: ParsedResumeData): Record<string, unknown> {
  return {
    name: parsed.name || "Candidate",
    email: parsed.email,
    phone: parsed.phone || "",
    location: parsed.location || "",
    title: parsed.title || parsed.targetRole || "Software Engineer",
    targetRole: parsed.targetRole || "Software Engineer",
    summary: parsed.summary || "",
    education: parsed.education,
    experience: parsed.experience,
    projects: parsed.projects,
    skills: parsed.skills,
    certifications: parsed.certifications,
    linkedin: parsed.linkedin || "",
    github: parsed.github || "",
    aiEnhanced: false,
  };
}
