import { modelGateway } from "../../core/model/model-gateway";
import { z } from "zod";
import { getPrompt, renderPrompt } from "./index";
import { parseStructuredResponse } from "./json-utils";
import type { PromptCategory, PromptVariables, PromptVersion } from "./types";

export const DEFAULT_LLM_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
export const REASONING_LLM_MODEL = process.env.OLLAMA_MODEL_REASONING || "deepseek-r1:8b";

function activeVersion(): PromptVersion {
  const v = (process.env.PROMPT_VERSION || "v2") as PromptVersion;
  return v === "v1" || v === "v2" || v === "v3" ? v : "v2";
}

export async function llmComplete(
  system: string,
  user: string,
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const res = await modelGateway.complete({
    system,
    prompt: user,
    model: options?.model || DEFAULT_LLM_MODEL,
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 1024,
  });
  return res.text.trim();
}

export async function llmFromPrompt(
  category: PromptCategory,
  name: string,
  variables: PromptVariables,
  options?: { version?: PromptVersion; model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const version = options?.version || activeVersion();
  const template = getPrompt(category, name, version);
  const { system, user } = renderPrompt(template, variables);
  return llmComplete(system, user, options);
}

export async function llmPromptJson<T>(
  category: PromptCategory,
  name: string,
  variables: PromptVariables,
  schema: z.ZodType<T>,
  fallback: T,
  options?: { version?: PromptVersion; model?: string; temperature?: number }
): Promise<{ data: T; valid: boolean; source: "llm" | "fallback" }> {
  const raw = await llmFromPrompt(category, name, variables, {
    ...options,
    version: options?.version || activeVersion(),
    maxTokens: 1536,
    temperature: options?.temperature ?? 0.4,
  });
  return parseStructuredResponse(raw, schema, fallback);
}
