import type { CodingProblemSpec } from "../evaluators/coding-evaluator";

export const CODING_PROBLEM_BANK: CodingProblemSpec[] = [
  {
    title: "Two Sum",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume each input has exactly one solution.",
    difficulty: "easy",
    topics: ["arrays", "hash-map"],
    constraints: "2 <= nums.length <= 10^4",
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
  },
  {
    title: "Valid Parentheses",
    description:
      "Given a string s containing just '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets are closed in the correct order.",
    difficulty: "easy",
    topics: ["stack", "strings"],
    constraints: "1 <= s.length <= 10^4",
    examples: [{ input: 's = "()[]{}"', output: "true" }],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    description:
      "Given a string s, find the length of the longest substring without repeating characters.",
    difficulty: "medium",
    topics: ["sliding-window", "hash-map"],
    constraints: "0 <= s.length <= 5 * 10^4",
    examples: [{ input: 's = "abcabcbb"', output: "3" }],
  },
  {
    title: "Merge Intervals",
    description:
      "Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals and return the merged intervals.",
    difficulty: "medium",
    topics: ["sorting", "arrays"],
    constraints: "1 <= intervals.length <= 10^4",
    examples: [{ input: "intervals = [[1,3],[2,6],[8,10]]", output: "[[1,6],[8,10]]" }],
  },
];

export function pickCodingProblem(asked: string[], difficulty = "medium"): CodingProblemSpec {
  const pool = CODING_PROBLEM_BANK.filter(
    (p) => !asked.includes(p.title) && (difficulty === "medium" || p.difficulty === difficulty)
  );
  const available = pool.length ? pool : CODING_PROBLEM_BANK.filter((p) => !asked.includes(p.title));
  return available[Math.floor(Math.random() * available.length)] || CODING_PROBLEM_BANK[0];
}
