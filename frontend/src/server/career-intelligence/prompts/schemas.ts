import { z } from "zod";

export const QuestionGenerationSchema = z.object({
  question: z.string().min(10).max(500),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  rationale: z.string().optional(),
});

export const AnalysisEnrichmentSchema = z.object({
  followUp: z.string().nullable().optional(),
  feedback: z.string().optional(),
  probeAreas: z.array(z.string()).optional().default([]),
});

export const SessionEvaluationSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  hiringReadiness: z.enum(["not_ready", "developing", "ready", "strong"]).optional(),
});

export const FeedbackSchema = z.object({
  feedback: z.string(),
  actionableSteps: z.array(z.string()).default([]),
  priority: z.enum(["high", "medium", "low"]).optional().default("medium"),
  focusAreas: z.array(z.string()).default([]),
});

export const ResumeAnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  keywordSuggestions: z.array(z.string()).default([]),
  atsTips: z.array(z.string()).default([]),
  aiQualityScore: z.number().min(0).max(100).optional(),
});

export type QuestionGenerationResult = z.infer<typeof QuestionGenerationSchema>;
export type AnalysisEnrichmentResult = z.infer<typeof AnalysisEnrichmentSchema>;
export type SessionEvaluationResult = z.infer<typeof SessionEvaluationSchema>;
export type FeedbackResult = z.infer<typeof FeedbackSchema>;
export type ResumeAnalysisResult = z.infer<typeof ResumeAnalysisSchema>;

export const CodingProblemSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  topics: z.array(z.string()).default([]),
  constraints: z.string().optional(),
  examples: z.array(z.object({ input: z.string(), output: z.string() })).default([]),
  starterCode: z.string().optional(),
  rationale: z.string().optional(),
});

export const CodingDiscussionSchema = z.object({
  questions: z.array(z.string()).min(1).max(8),
  openingPrompt: z.string(),
  feedback: z.string(),
  actionableSteps: z.array(z.string()).default([]),
});

export type CodingProblemResult = z.infer<typeof CodingProblemSchema>;
export type CodingDiscussionResult = z.infer<typeof CodingDiscussionSchema>;

export const CareerRecommendationItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  category: z.string().optional(),
});

export const CareerRecommendationsSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  recommendations: z.array(CareerRecommendationItemSchema).min(1),
  focusAreas: z.array(z.string()).default([]),
});

export const RoadmapItemSchema = z.object({
  title: z.string(),
  type: z.enum(["course", "practice", "project", "interview", "certification"]).default("practice"),
  priority: z.number().int().min(1).max(10).default(5),
  estimatedWeeks: z.number().optional(),
  description: z.string().optional(),
});

export const LearningRoadmapSchema = z.object({
  title: z.string(),
  summary: z.string(),
  items: z.array(RoadmapItemSchema).min(1),
});

export type CareerRecommendationsResult = z.infer<typeof CareerRecommendationsSchema>;
export type LearningRoadmapResult = z.infer<typeof LearningRoadmapSchema>;
