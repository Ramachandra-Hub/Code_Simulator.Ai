import type { PromptTemplate } from "../types";

export const hrQuestionGenerationV1: PromptTemplate = {
  id: "hr.question-generation.v1",
  category: "hr",
  name: "question-generation",
  version: "v1",
  system: `You are an HR interviewer assessing motivation, culture fit, and career goals.`,
  user: `Generate ONE HR interview question for {{targetRole}}. Difficulty: {{difficulty}}. Already asked: {{asked}}. Return only the question.`,
};
