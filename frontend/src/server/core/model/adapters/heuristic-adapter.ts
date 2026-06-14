import type { ModelAdapter, ModelRequest, ModelResponse } from "../types";

export class HeuristicFallbackAdapter implements ModelAdapter {
  name = "heuristic";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const start = Date.now();
    const prompt = req.prompt.toLowerCase();

    let text = "Analysis complete. Review the structured evaluation for detailed feedback.";

    if (prompt.includes("resume") || prompt.includes("summary")) {
      text = "Professional summary optimized for ATS compatibility with role-specific keywords and quantifiable achievements.";
    } else if (prompt.includes("interview") || prompt.includes("question")) {
      text = "Based on the candidate profile, focus on depth of technical contribution and specific project outcomes.";
    } else if (prompt.includes("team project") || prompt.includes("team")) {
      text = "Probe individual contribution: What was YOUR specific role? What did YOU personally build or decide?";
    } else if (prompt.includes("coding") || prompt.includes("complexity")) {
      text = "Evaluate time and space complexity. Discuss edge cases and potential optimizations.";
    } else if (prompt.includes("placement") || prompt.includes("readiness")) {
      text = "Placement readiness assessment: strengthen technical depth, communication clarity, and resume-keyword alignment.";
    } else if (prompt.includes("skill gap")) {
      text = "Identified skill gaps require targeted practice in core competencies and project-based learning.";
    } else if (prompt.includes("career") || prompt.includes("roadmap")) {
      text = "Recommended path: complete foundational courses, build portfolio projects, practice mock interviews weekly.";
    }

    return {
      text,
      model: "heuristic-fallback",
      tokens: text.split(/\s+/).length,
      latencyMs: Date.now() - start,
    };
  }
}
