import type { Judge0Result } from "../integrations/judge0-client";

export interface CodingProblemSpec {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics?: string[];
  constraints?: string;
  examples?: Array<{ input: string; output: string }>;
}

export interface CodingHeuristicEvaluation {
  correctnessScore: number;
  complexityScore: number;
  styleScore: number;
  overallScore: number;
  timeComplexity: string;
  spaceComplexity: string;
  algorithmSkills: number;
  problemSolving: number;
  optimizationSkills: number;
  passed: boolean;
  verdict: string;
  signals: string[];
  source: "heuristic";
}

const VERDICT_SCORES: Record<string, number> = {
  Accepted: 95,
  "Wrong Answer": 45,
  "Time Limit Exceeded": 50,
  "Runtime Error": 35,
  "Compilation Error": 20,
  "Memory Limit Exceeded": 40,
};

function inferTimeComplexity(code: string): string {
  const lower = code.toLowerCase();
  if (/sort\(|\.sort\(|quicksort|mergesort|heapsort/.test(lower)) return "O(n log n)";
  if (/for\s*\([^)]*\)\s*\{[^}]*for\s*\(/.test(code)) return "O(n²)";
  if (/while\s*\(|for\s*\(/.test(code) && /binary\s*search|bisect/.test(lower)) return "O(log n)";
  if (/for\s*\(|while\s*\(/.test(code)) return "O(n)";
  if (/recursion|recursive|def\s+\w+\([^)]*\):/.test(code)) return "O(n) or O(2^n)";
  return "O(1) — constant or unclear";
}

function inferSpaceComplexity(code: string): string {
  const lower = code.toLowerCase();
  if (/new\s+(array|list|dict|map|set)|\[\]|hashmap|hash_map|unordered_map/.test(lower)) return "O(n)";
  if (/recursion|recursive/.test(lower)) return "O(n) stack depth";
  return "O(1)";
}

function scoreOptimization(code: string): number {
  let score = 40;
  const patterns: Array<[RegExp, number, string]> = [
    [/hash\s*map|dict\s*\{|set\s*\(|unordered_map|HashMap/i, 15, "hash_structure"],
    [/two\s*pointer|left.*right|sliding\s*window/i, 15, "two_pointer"],
    [/binary\s*search|bisect/i, 12, "binary_search"],
    [/dynamic\s*programming|dp\[|memo/i, 12, "dp"],
    [/heapq|priority\s*queue|minheap/i, 10, "heap"],
    [/bfs|dfs|queue|stack/i, 8, "graph_traversal"],
  ];
  const signals: string[] = [];
  for (const [re, pts, sig] of patterns) {
    if (re.test(code)) {
      score += pts;
      signals.push(sig);
    }
  }
  return Math.min(100, score);
}

function scoreStyle(code: string): number {
  let score = 55;
  if (code.length > 30) score += 10;
  if (/def\s+\w+|function\s+\w+|class\s+\w+/.test(code)) score += 15;
  if (/#|\/\/|\/\*/.test(code)) score += 10;
  if (code.split("\n").length > 5) score += 5;
  if (/print\(|console\.log\(/g.test(code) && (code.match(/print\(|console\.log\(/g)?.length || 0) > 3) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function scoreAlgorithmSkills(code: string, topics: string[] = []): number {
  let score = 45;
  const topicHits = topics.filter((t) => code.toLowerCase().includes(t.toLowerCase())).length;
  score += topicHits * 10;
  if (/sort|search|tree|graph|array|linked|stack|queue/i.test(code)) score += 15;
  return Math.min(100, score);
}

export function evaluateCodeHeuristic(
  code: string,
  judge0: Judge0Result,
  problem?: Partial<CodingProblemSpec>
): CodingHeuristicEvaluation {
  const verdict = judge0.status?.description || "Unknown";
  const passed = verdict === "Accepted";
  const correctnessScore = VERDICT_SCORES[verdict] ?? (passed ? 90 : 30);

  const timeComplexity = inferTimeComplexity(code);
  const spaceComplexity = inferSpaceComplexity(code);
  const optimizationSkills = scoreOptimization(code);
  const styleScore = scoreStyle(code);
  const algorithmSkills = scoreAlgorithmSkills(code, problem?.topics || []);

  let complexityScore = 50;
  if (/O\(1\)/.test(timeComplexity)) complexityScore = 85;
  else if (/O\(log n\)/.test(timeComplexity)) complexityScore = 80;
  else if (/O\(n\)/.test(timeComplexity) && !/O\(n²\)/.test(timeComplexity)) complexityScore = 70;
  else if (/O\(n log n\)/.test(timeComplexity)) complexityScore = 75;
  else if (/O\(n²\)/.test(timeComplexity)) complexityScore = 45;
  complexityScore = Math.round((complexityScore + optimizationSkills) / 2);

  const problemSolving = Math.round(
    correctnessScore * 0.5 + complexityScore * 0.25 + algorithmSkills * 0.25
  );

  const difficultyBoost = problem?.difficulty === "hard" ? 1.05 : problem?.difficulty === "easy" ? 0.95 : 1;
  const overallScore = Math.min(
    100,
    Math.round(
      (correctnessScore * 0.45 + complexityScore * 0.25 + styleScore * 0.15 + algorithmSkills * 0.15) * difficultyBoost
    )
  );

  const signals: string[] = [];
  if (passed) signals.push("tests_passed");
  else signals.push("tests_failed");
  if (optimizationSkills >= 70) signals.push("good_optimization");
  if (styleScore >= 70) signals.push("clean_code");

  return {
    correctnessScore,
    complexityScore,
    styleScore,
    overallScore,
    timeComplexity,
    spaceComplexity,
    algorithmSkills,
    problemSolving,
    optimizationSkills,
    passed,
    verdict,
    signals,
    source: "heuristic",
  };
}
