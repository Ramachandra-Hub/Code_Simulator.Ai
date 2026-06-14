export type PromptCategory =
  | "technical"
  | "coding"
  | "hr"
  | "behavioral"
  | "resume"
  | "career"
  | "panel"
  | "evaluation"
  | "response";

export type PromptVersion = "v1" | "v2" | "v3";

export interface PromptTemplate {
  id: string;
  category: PromptCategory;
  name: string;
  version: PromptVersion;
  system: string;
  user: string;
  /** When true, response must be valid JSON */
  structured?: boolean;
  description?: string;
}

export type PromptVariables = Record<string, string | number | boolean | string[] | object | null | undefined>;
