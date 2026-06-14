export interface MissionTask {
  id: string;
  title: string;
  type: "coding" | "interview" | "learning" | "github" | "profile" | "project";
  priority: number;
  estimatedMinutes: number;
}

export interface TwinMissionInput {
  weaknesses: string[];
  strengths: string[];
  codingReadiness: number;
  interviewReadiness: number;
  technicalScore: number;
  githubScore: number;
  leetcodeScore: number;
  professionalReadiness: number;
  targetRole: string;
  roadmapPending: string[];
  interviewImprovements: string[];
}

function task(id: string, title: string, type: MissionTask["type"], priority: number, mins: number): MissionTask {
  return { id, title, type, priority, estimatedMinutes: mins };
}

export function generateDailyMission(input: TwinMissionInput): { title: string; tasks: MissionTask[] } {
  const tasks: MissionTask[] = [];
  let n = 0;

  if (input.codingReadiness < 70 || input.weaknesses.some((w) => /dsa|algorithm|coding/i.test(w))) {
    tasks.push(task(`d${++n}`, "Solve 2 medium LeetCode problems aligned to your skill gaps", "coding", 1, 60));
  } else {
    tasks.push(task(`d${++n}`, "Solve 1 hard LeetCode problem to push your ceiling", "coding", 2, 45));
  }

  if (input.githubScore < 60) {
    tasks.push(task(`d${++n}`, "Improve your top GitHub project README with architecture and metrics", "github", 2, 30));
  }

  if (input.interviewReadiness < 65) {
    const topic = input.interviewImprovements[0] || input.weaknesses[0] || "system design";
    tasks.push(task(`d${++n}`, `Take 1 mock interview focused on ${topic}`, "interview", 1, 45));
  }

  if (/ai|ml|data/i.test(input.targetRole)) {
    tasks.push(task(`d${++n}`, "Complete 1 System Design or ML fundamentals lesson", "learning", 2, 40));
  } else {
    tasks.push(task(`d${++n}`, "Complete 1 System Design or backend fundamentals lesson", "learning", 2, 40));
  }

  if (input.roadmapPending[0]) {
    tasks.push(task(`d${++n}`, `Roadmap: ${input.roadmapPending[0]}`, "learning", 3, 30));
  }

  if (input.professionalReadiness < 55) {
    tasks.push(task(`d${++n}`, "Update LinkedIn headline and add 1 portfolio highlight", "profile", 3, 20));
  }

  return {
    title: `Today's Action Plan — ${input.targetRole}`,
    tasks: tasks.sort((a, b) => a.priority - b.priority).slice(0, 5),
  };
}

export function generateWeeklyMission(input: TwinMissionInput): { title: string; tasks: MissionTask[] } {
  const tasks: MissionTask[] = [
    task("w1", "Complete 8+ coding problems (mix easy/medium/hard)", "coding", 1, 300),
    task("w2", "2 full mock interviews (technical + behavioral)", "interview", 1, 90),
    task("w3", `Ship 1 portfolio-visible project update for ${input.targetRole}`, "project", 2, 120),
    task("w4", "Sync GitHub + LeetCode profiles and review twin weaknesses", "profile", 3, 45),
  ];
  if (input.weaknesses.length) {
    tasks.push(task("w5", `Target weakness: ${input.weaknesses.slice(0, 2).join(", ")}`, "learning", 2, 90));
  }
  return { title: `Weekly Sprint — ${input.targetRole}`, tasks };
}

export function generateMonthlyMission(input: TwinMissionInput): { title: string; tasks: MissionTask[] } {
  return {
    title: `Monthly Career Push — ${input.targetRole}`,
    tasks: [
      task("m1", "Raise placement readiness by 10+ points via consistent practice", "learning", 1, 0),
      task("m2", "Complete career roadmap milestone (3+ items)", "learning", 1, 0),
      task("m3", "Achieve interview score ≥75 in mock panel or MNC interview", "interview", 2, 0),
      task("m4", "Professional profile score ≥70 (GitHub + LinkedIn + portfolio)", "profile", 2, 0),
      task("m5", `Demonstrate ${input.targetRole} depth in 1 substantial project`, "project", 1, 0),
    ],
  };
}

export const GOAL_TEMPLATES = [
  { id: "ai_engineer", title: "AI Engineer", targetRole: "AI Engineer" },
  { id: "backend_engineer", title: "Backend Engineer", targetRole: "Backend Engineer" },
  { id: "fullstack_engineer", title: "Full Stack Engineer", targetRole: "Full Stack Engineer" },
  { id: "data_scientist", title: "Data Scientist", targetRole: "Data Scientist" },
  { id: "ml_engineer", title: "ML Engineer", targetRole: "ML Engineer" },
  { id: "cybersecurity_engineer", title: "Cybersecurity Engineer", targetRole: "Cybersecurity Engineer" },
  { id: "product_manager", title: "Product Manager", targetRole: "Product Manager" },
  { id: "custom", title: "Custom Goal", targetRole: "Custom" },
] as const;
