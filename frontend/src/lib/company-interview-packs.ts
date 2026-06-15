export interface CompanyInterviewPack {
  id: string;
  name: string;
  tagline: string;
  interviewStyle: string;
  focusAreas: string[];
  rubric: string[];
  /** Weight for placement fit messaging */
  tier: "service" | "product" | "faang";
}

export const COMPANY_INTERVIEW_PACKS: CompanyInterviewPack[] = [
  {
    id: "tcs",
    name: "TCS",
    tagline: "Aptitude-heavy + fundamentals + HR",
    interviewStyle: "Structured campus drive — verbal reasoning, C/Java basics, project explanation, HR fit",
    focusAreas: ["aptitude", "C", "Java", "DBMS", "communication", "teamwork"],
    rubric: ["Clarity", "Fundamentals", "Attitude", "Stability"],
    tier: "service",
  },
  {
    id: "infosys",
    name: "Infosys",
    tagline: "Technical + puzzle + HR",
    interviewStyle: "Online test + technical on projects + HR on career goals",
    focusAreas: ["logical reasoning", "OOP", "SQL", "projects", "communication"],
    rubric: ["Problem solving", "Learning agility", "Culture fit"],
    tier: "service",
  },
  {
    id: "wipro",
    name: "Wipro",
    tagline: "Technical + HR + adaptability",
    interviewStyle: "Role-based technical + behavioral + adaptability probes",
    focusAreas: ["Java", "Python", "SQL", "SDLC", "teamwork"],
    rubric: ["Technical basics", "Communication", "Flexibility"],
    tier: "service",
  },
  {
    id: "accenture",
    name: "Accenture",
    tagline: "Communication + case + technical",
    interviewStyle: "HR screening + technical + case-style scenarios",
    focusAreas: ["communication", "analytics", "SQL", "cloud basics", "client scenarios"],
    rubric: ["Client readiness", "Communication", "Technical breadth"],
    tier: "service",
  },
  {
    id: "amazon",
    name: "Amazon",
    tagline: "Leadership Principles + deep dives",
    interviewStyle: "LP behavioral + technical bar raiser + system thinking",
    focusAreas: ["Leadership Principles", "STAR stories", "DSA", "system design", "ownership"],
    rubric: ["Customer obsession", "Ownership", "Dive deep", "Deliver results"],
    tier: "product",
  },
  {
    id: "google",
    name: "Google",
    tagline: "Algorithms + problem solving",
    interviewStyle: "Coding + algorithms + googliness + collaboration",
    focusAreas: ["algorithms", "data structures", "complexity", "collaboration", "communication"],
    rubric: ["Coding", "Problem decomposition", "Communication", "Googleyness"],
    tier: "faang",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    tagline: "Technical + collaboration",
    interviewStyle: "Coding + design + behavioral collaboration focus",
    focusAreas: ["C#", "algorithms", "system design", "teamwork", "growth mindset"],
    rubric: ["Technical depth", "Collaboration", "Growth mindset"],
    tier: "faang",
  },
];

export function getCompanyPack(id: string): CompanyInterviewPack | undefined {
  return COMPANY_INTERVIEW_PACKS.find((p) => p.id === id);
}
