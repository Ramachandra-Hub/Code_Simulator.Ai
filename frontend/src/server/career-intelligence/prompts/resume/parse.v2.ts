import type { PromptTemplate } from "../types";

export const resumeParseV2: PromptTemplate = {
  id: "resume.parse.v2",
  category: "resume",
  name: "parse",
  version: "v2",
  structured: true,
  description: "Extract structured resume fields from raw resume text",
  system: `You extract structured resume data from raw text. Return valid JSON only.
Rules:
- Extract only what is present in the text — do not invent employers, projects, or skills.
- Normalize skills as a flat array of individual technologies/tools.
- Preserve bullet points in experience/project descriptions.
- Infer targetRole from title or objective if stated; otherwise use "Software Engineer".`,
  user: `Extract resume fields from this text:

{{rawText}}

Return JSON:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "title": "string",
  "targetRole": "string",
  "summary": "string",
  "skills": ["string"],
  "education": [{"institution":"","degree":"","field":"","startYear":"","endYear":"","cgpa":""}],
  "experience": [{"company":"","role":"","startDate":"","endDate":"","description":""}],
  "projects": [{"name":"","description":"","technologies":"","link":""}],
  "certifications": ["string"],
  "linkedin": "string",
  "github": "string"
}`,
};
