export interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  cgpa: string;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string;
  link: string;
}

export interface ResumeData {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  targetRole: string;
  summary: string;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: string[];
  certifications: string[];
  linkedin: string;
  github: string;
  atsScore: number;
  atsFeedback: string[];
  keywordsMatched?: string[];
  keywordsMissing?: string[];
  aiEnhanced: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const RESUME_TEMPLATES = [
  "Software Engineer",
  "Data Scientist",
  "AI Engineer",
  "Full Stack Developer",
  "Product Manager",
  "DevOps Engineer",
] as const;

export const TARGET_ROLE_KEYWORDS: Record<string, string[]> = {
  "Software Engineer": ["JavaScript", "TypeScript", "React", "Node.js", "DSA", "Git", "API", "SQL", "Agile"],
  "Data Scientist": ["Python", "Machine Learning", "Pandas", "SQL", "Statistics", "TensorFlow", "Visualization"],
  "AI Engineer": ["Python", "LLM", "PyTorch", "NLP", "MLOps", "OpenAI", "Transformers", "RAG"],
  "Full Stack Developer": ["React", "Node.js", "PostgreSQL", "REST", "AWS", "Docker", "CI/CD"],
  "Product Manager": ["Roadmap", "Stakeholder", "Analytics", "User Research", "Agile", "PRD"],
  "DevOps Engineer": ["Kubernetes", "Docker", "AWS", "CI/CD", "Terraform", "Linux", "Monitoring"],
};
