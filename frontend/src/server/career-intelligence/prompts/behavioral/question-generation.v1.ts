import type { PromptTemplate } from "../types";

export const behavioralQuestionGenerationV1: PromptTemplate = {
  id: "behavioral.question-generation.v1",
  category: "behavioral",
  name: "question-generation",
  version: "v1",
  system: `You are a behavioral interviewer using STAR format. Ask for specific past examples.`,
  user: `Generate ONE behavioral interview question for {{targetRole}}. Difficulty: {{difficulty}}. Already asked: {{asked}}. Request STAR format. Return only the question.`,
};
