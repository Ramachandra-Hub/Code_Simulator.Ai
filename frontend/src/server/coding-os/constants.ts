import type { CodeLanguage, CodeProblemCategory } from "@prisma/client";

export const CODING_OS_LANGUAGES: { id: CodeLanguage; label: string; monaco: string }[] = [
  { id: "python", label: "Python", monaco: "python" },
  { id: "java", label: "Java", monaco: "java" },
  { id: "c", label: "C", monaco: "c" },
  { id: "cpp", label: "C++", monaco: "cpp" },
  { id: "javascript", label: "JavaScript", monaco: "javascript" },
  { id: "typescript", label: "TypeScript", monaco: "typescript" },
  { id: "sql", label: "SQL", monaco: "sql" },
];

export const DSA_TOPIC_SLUGS: { slug: string; name: string; category: CodeProblemCategory }[] = [
  { slug: "arrays", name: "Arrays", category: "arrays" },
  { slug: "strings", name: "Strings", category: "strings" },
  { slug: "linked-lists", name: "Linked Lists", category: "linked_lists" },
  { slug: "stacks", name: "Stacks", category: "stacks" },
  { slug: "queues", name: "Queues", category: "queues" },
  { slug: "trees", name: "Trees", category: "trees" },
  { slug: "graphs", name: "Graphs", category: "graphs" },
  { slug: "dp", name: "Dynamic Programming", category: "dp" },
];

export const COMPANY_SLUGS = [
  "Amazon",
  "Google",
  "Microsoft",
  "TCS",
  "Infosys",
  "Wipro",
  "Accenture",
] as const;

export function verdictFromJudgeStatus(id: number): import("@prisma/client").CodeVerdict {
  if (id === 3) return "accepted";
  if (id === 4) return "wrong_answer";
  if (id === 5) return "time_limit";
  if (id === 6) return "compile_error";
  if (id === 11 || id === 12) return "runtime_error";
  if (id === 13) return "memory_limit";
  return "runtime_error";
}
