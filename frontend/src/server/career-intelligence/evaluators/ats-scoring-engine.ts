import { TARGET_ROLE_KEYWORDS } from "@/lib/resume-types";

export interface AtsBreakdown {
  contactInfo: number;
  summary: number;
  skills: number;
  keywordMatch: number;
  experience: number;
  education: number;
  projects: number;
  links: number;
  structure: number;
}

export interface AtsScoreResult {
  score: number;
  feedback: string[];
  keywordsMatched: string[];
  keywordsMissing: string[];
  breakdown: AtsBreakdown;
  keywordMatchPct: number;
}

function resumePlainText(data: Record<string, unknown>): string {
  const skills = ((data.skills as string[]) || []).join(" ");
  return [
    data.name,
    data.email,
    data.phone,
    data.location,
    data.title,
    data.targetRole,
    data.summary,
    skills,
    JSON.stringify(data.education || []),
    JSON.stringify(data.experience || []),
    JSON.stringify(data.projects || []),
    JSON.stringify(data.certifications || []),
    data.linkedin,
    data.github,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasQuantifiedBullet(text: string): boolean {
  return /\d+%|\d+\+|\$\d|₹\d|\d{2,}\s*(users|requests|ms|sec|days|months|years|k\b|m\b)/i.test(text);
}

function scoreContact(data: Record<string, unknown>): { points: number; notes: string[] } {
  const notes: string[] = [];
  let points = 0;
  const email = String(data.email || "");
  const phone = String(data.phone || "");
  const name = String(data.name || "");

  if (name.trim().length >= 2) points += 3;
  else notes.push("Add your full name at the top of the resume");

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) points += 4;
  else notes.push("Add a valid professional email address");

  if (phone.replace(/\D/g, "").length >= 10) points += 3;
  else notes.push("Add a reachable phone number with country code if applicable");

  return { points, notes };
}

function scoreSummary(data: Record<string, unknown>): { points: number; notes: string[] } {
  const summary = String(data.summary || "").trim();
  const notes: string[] = [];
  if (!summary) {
    notes.push("Add a 2–4 line professional summary targeting your role");
    return { points: 0, notes };
  }
  const words = summary.split(/\s+/).length;
  if (words < 15) {
    notes.push("Expand your summary — aim for 40–80 words with role and key skills");
    return { points: 4, notes };
  }
  if (words > 120) {
    notes.push("Shorten your summary — ATS prefers concise 2–4 lines");
    return { points: 7, notes };
  }
  return { points: 10, notes };
}

function scoreSkills(data: Record<string, unknown>, targetRole: string): { points: number; notes: string[] } {
  const skills = ((data.skills as string[]) || []).map((s) => s.trim()).filter(Boolean);
  const notes: string[] = [];
  if (skills.length === 0) {
    notes.push("Add a dedicated Skills section with role-relevant technologies");
    return { points: 0, notes };
  }
  if (skills.length < 5) notes.push("List at least 5–8 skills relevant to your target role");
  if (skills.length > 20) notes.push("Too many skills — prioritize the most relevant 8–12");

  const roleKeywords = TARGET_ROLE_KEYWORDS[targetRole] || TARGET_ROLE_KEYWORDS["Software Engineer"];
  const skillText = skills.join(" ").toLowerCase();
  const roleHits = roleKeywords.filter((kw) => skillText.includes(kw.toLowerCase())).length;
  const points = Math.min(15, Math.round(skills.length * 1.5) + Math.min(5, roleHits * 2));
  return { points: Math.min(20, points), notes };
}

function scoreKeywords(
  text: string,
  targetRole: string
): { points: number; matched: string[]; missing: string[]; notes: string[] } {
  const roleKeywords = TARGET_ROLE_KEYWORDS[targetRole] || TARGET_ROLE_KEYWORDS["Software Engineer"];
  const matched = roleKeywords.filter((kw) => text.includes(kw.toLowerCase()));
  const missing = roleKeywords.filter((kw) => !matched.includes(kw));
  const pct = matched.length / roleKeywords.length;
  const points = Math.round(pct * 25);
  const notes: string[] = [];
  if (pct < 0.4) notes.push(`Add role keywords for ${targetRole}: ${missing.slice(0, 4).join(", ")}`);
  else if (pct < 0.7) notes.push("Good keyword coverage — add a few more role-specific terms from job descriptions");
  return { points, matched, missing, notes };
}

function scoreExperience(data: Record<string, unknown>): { points: number; notes: string[] } {
  const experience = (data.experience as Array<{ description?: string; role?: string; company?: string }>) || [];
  const notes: string[] = [];
  if (!experience.length) {
    notes.push("Add internships, freelance work, or project-based experience with bullet points");
    return { points: 0, notes };
  }
  const bullets = experience.map((e) => e.description || "").filter(Boolean);
  const quantified = bullets.filter(hasQuantifiedBullet).length;
  let points = Math.min(10, experience.length * 4);
  if (quantified > 0) points += Math.min(5, quantified * 3);
  else notes.push("Use numbers in experience bullets (%, users, latency, team size)");
  return { points: Math.min(15, points), notes };
}

function scoreProjects(data: Record<string, unknown>): { points: number; notes: string[] } {
  const projects = (data.projects as Array<{ name?: string; description?: string; technologies?: string }>) || [];
  const notes: string[] = [];
  if (!projects.length) {
    notes.push("Include 1–3 projects with tech stack and measurable outcomes");
    return { points: 0, notes };
  }
  const withTech = projects.filter((p) => (p.technologies || "").trim().length > 3).length;
  const withMetrics = projects.filter((p) => hasQuantifiedBullet(p.description || "")).length;
  let points = Math.min(8, projects.length * 3);
  if (withTech) points += 2;
  if (withMetrics) points += 3;
  else notes.push("Add metrics to project descriptions (accuracy, scale, performance)");
  return { points: Math.min(10, points), notes };
}

function scoreEducation(data: Record<string, unknown>): { points: number; notes: string[] } {
  const education = (data.education as Array<{ institution?: string; degree?: string }>) || [];
  const notes: string[] = [];
  if (!education.length) {
    notes.push("Add education with degree, institution, and graduation year");
    return { points: 0, notes };
  }
  const complete = education.filter((e) => e.institution && e.degree).length;
  return { points: complete ? 10 : 5, notes };
}

function scoreLinks(data: Record<string, unknown>): { points: number; notes: string[] } {
  const notes: string[] = [];
  let points = 0;
  const linkedin = String(data.linkedin || "");
  const github = String(data.github || "");
  if (/linkedin\.com/i.test(linkedin)) points += 3;
  else notes.push("Add a LinkedIn profile URL");
  if (/github\.com/i.test(github)) points += 2;
  else notes.push("Add a GitHub profile for technical roles");
  return { points, notes };
}

function scoreStructure(data: Record<string, unknown>): { points: number; notes: string[] } {
  const notes: string[] = [];
  let sections = 0;
  if (data.summary) sections++;
  if ((data.skills as string[])?.length) sections++;
  if ((data.education as unknown[])?.length) sections++;
  if ((data.experience as unknown[])?.length || (data.projects as unknown[])?.length) sections++;
  if (sections < 3) notes.push("Structure resume with clear sections: Summary, Skills, Education, Experience/Projects");
  return { points: Math.min(10, sections * 2.5), notes };
}

/** Deterministic ATS score from resume content — not a fake skill-count formula. */
export function computeAtsScore(
  data: Record<string, unknown>,
  targetRole?: string
): AtsScoreResult {
  const role = targetRole || String(data.targetRole || "Software Engineer");
  const text = resumePlainText(data);

  const contact = scoreContact(data);
  const summary = scoreSummary(data);
  const skills = scoreSkills(data, role);
  const keywords = scoreKeywords(text, role);
  const experience = scoreExperience(data);
  const projects = scoreProjects(data);
  const education = scoreEducation(data);
  const links = scoreLinks(data);
  const structure = scoreStructure(data);

  const breakdown: AtsBreakdown = {
    contactInfo: contact.points,
    summary: summary.points,
    skills: skills.points,
    keywordMatch: keywords.points,
    experience: experience.points,
    education: education.points,
    projects: projects.points,
    links: links.points,
    structure: structure.points,
  };

  const rawTotal =
    breakdown.contactInfo +
    breakdown.summary +
    breakdown.skills +
    breakdown.keywordMatch +
    breakdown.experience +
    breakdown.education +
    breakdown.projects +
    breakdown.links +
    breakdown.structure;

  const score = Math.max(0, Math.min(100, Math.round(rawTotal)));
  const feedback = [
    ...contact.notes,
    ...summary.notes,
    ...skills.notes,
    ...keywords.notes,
    ...experience.notes,
    ...projects.notes,
    ...education.notes,
    ...links.notes,
    ...structure.notes,
  ].filter(Boolean);

  if (feedback.length === 0) {
    feedback.push("Strong ATS structure — keep keywords aligned with each job description you apply to");
  }

  const keywordMatchPct = keywords.matched.length
    ? Math.round((keywords.matched.length / (keywords.matched.length + keywords.missing.length)) * 100)
    : 0;

  return {
    score,
    feedback: [...new Set(feedback)].slice(0, 10),
    keywordsMatched: keywords.matched,
    keywordsMissing: keywords.missing,
    breakdown,
    keywordMatchPct,
  };
}

/** AI quality score — content depth, impact language, and completeness (deterministic baseline). */
export function computeAiQualityScore(data: Record<string, unknown>, ats: AtsScoreResult): number {
  const text = resumePlainText(data);
  let score = Math.round(ats.score * 0.35);

  const metrics = (text.match(/\d+%|\d+\+|\$\d|₹\d|\d{2,}/gi) || []).length;
  score += Math.min(20, metrics * 4);

  const skills = ((data.skills as string[]) || []).length;
  score += Math.min(12, skills * 1.5);

  const projects = (data.projects as unknown[])?.length || 0;
  const experience = (data.experience as unknown[])?.length || 0;
  score += Math.min(15, (projects + experience) * 5);

  const summaryWords = String(data.summary || "").split(/\s+/).filter(Boolean).length;
  if (summaryWords >= 25 && summaryWords <= 100) score += 8;

  if (ats.keywordsMatched.length >= 5) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}
