import type { PromptCategory, PromptTemplate, PromptVariables, PromptVersion } from "./types";
import { questionGenerationV1 } from "./technical/question-generation.v1";
import { questionGenerationV2 } from "./technical/question-generation.v2";
import { hrQuestionGenerationV1 } from "./hr/question-generation.v1";
import { behavioralQuestionGenerationV1 } from "./behavioral/question-generation.v1";
import { analysisEnrichmentV2 } from "./response/analysis-enrichment.v2";
import { sessionEvaluationV2 } from "./evaluation/session-evaluation.v2";
import { feedbackV2 } from "./evaluation/feedback.v2";
import { resumeAnalysisV2 } from "./resume/analysis.v2";
import { resumeParseV2 } from "./resume/parse.v2";
import { codingProblemGenerationV2 } from "./coding/problem-generation.v2";
import { codingDiscussionV2 } from "./coding/discussion.v2";
import { careerRecommendationsV2 } from "./career/recommendations.v2";
import { careerRoadmapV2 } from "./career/roadmap.v2";
import { panelQuestionGenerationV2 } from "./panel/panel-question-generation.v2";

const REGISTRY: PromptTemplate[] = [
  questionGenerationV1,
  questionGenerationV2,
  hrQuestionGenerationV1,
  behavioralQuestionGenerationV1,
  analysisEnrichmentV2,
  sessionEvaluationV2,
  feedbackV2,
  resumeAnalysisV2,
  codingProblemGenerationV2,
  codingDiscussionV2,
  careerRecommendationsV2,
  careerRoadmapV2,
  panelQuestionGenerationV2,
  resumeParseV2,
];

const STABLE_VERSION: PromptVersion = (process.env.PROMPT_VERSION as PromptVersion) || "v2";

function formatValue(value: PromptVariables[string]): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Replace {{key}} placeholders in template strings */
export function renderTemplateString(template: string, variables: PromptVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => formatValue(variables[key]));
}

export function renderPrompt(
  template: PromptTemplate,
  variables: PromptVariables
): { system: string; user: string } {
  return {
    system: renderTemplateString(template.system, variables),
    user: renderTemplateString(template.user, variables),
  };
}

export function listPrompts(category?: PromptCategory): PromptTemplate[] {
  if (!category) return [...REGISTRY];
  return REGISTRY.filter((p) => p.category === category);
}

/**
 * Resolve prompt by category + name + version.
 * Falls back: requested version → v2 → v1 → latest registered.
 */
export function getPrompt(
  category: PromptCategory,
  name: string,
  version?: PromptVersion
): PromptTemplate {
  const requested = version || STABLE_VERSION;
  const matches = REGISTRY.filter((p) => p.category === category && p.name === name);

  if (matches.length === 0) {
    // Cross-category aliases for question-generation by interview type
    if (name === "question-generation") {
      const technical = REGISTRY.find((p) => p.id === `technical.question-generation.${requested}`)
        || REGISTRY.find((p) => p.id === "technical.question-generation.v2")
        || REGISTRY.find((p) => p.id === "technical.question-generation.v1");
      if (technical) return technical;
    }
    throw new Error(`Prompt not found: ${category}/${name}`);
  }

  return (
    matches.find((p) => p.version === requested) ||
    matches.find((p) => p.version === "v2") ||
    matches.find((p) => p.version === "v1") ||
    matches[matches.length - 1]
  );
}

/** Pick question-generation prompt category from interview type */
export function questionPromptCategory(interviewType: string): PromptCategory {
  if (interviewType === "hr") return "hr";
  if (interviewType === "behavioral") return "behavioral";
  if (interviewType === "coding") return "coding";
  return "technical";
}

export function getQuestionGenerationPrompt(interviewType: string, version?: PromptVersion): PromptTemplate {
  const category = questionPromptCategory(interviewType);
  try {
    return getPrompt(category, "question-generation", version);
  } catch {
    return getPrompt("technical", "question-generation", version);
  }
}

export { REGISTRY as promptRegistry };
