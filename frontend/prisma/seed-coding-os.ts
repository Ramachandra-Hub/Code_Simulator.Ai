import { PrismaClient, CodeDifficulty, CodeProblemCategory } from "@prisma/client";

const prisma = new PrismaClient();

const TOPICS: { slug: string; name: string; order: number; category: CodeProblemCategory }[] = [
  { slug: "arrays", name: "Arrays", order: 1, category: "arrays" },
  { slug: "strings", name: "Strings", order: 2, category: "strings" },
  { slug: "linked-lists", name: "Linked Lists", order: 3, category: "linked_lists" },
  { slug: "stacks", name: "Stacks", order: 4, category: "stacks" },
  { slug: "queues", name: "Queues", order: 5, category: "queues" },
  { slug: "trees", name: "Trees", order: 6, category: "trees" },
  { slug: "graphs", name: "Graphs", order: 7, category: "graphs" },
  { slug: "dp", name: "Dynamic Programming", order: 8, category: "dp" },
];

const COMPANIES = ["Amazon", "Google", "Microsoft", "TCS", "Infosys", "Wipro", "Accenture"];

type SeedProblem = {
  slug: string;
  title: string;
  description: string;
  difficulty: CodeDifficulty;
  category: CodeProblemCategory;
  topicSlug: string;
  constraints: string;
  examples: { input: string; output: string }[];
  starterCode: Record<string, string>;
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
  hints: string[];
  expectedTime: string;
  expectedSpace: string;
  company?: string;
};

const PROBLEMS: SeedProblem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume each input has exactly one solution.",
    difficulty: "easy",
    category: "arrays",
    topicSlug: "arrays",
    constraints: "2 <= nums.length <= 10^4",
    examples: [{ input: "2 7 11 15\n9", output: "0 1" }],
    starterCode: {
      python: "def solution(nums, target):\n    # nums: list[int], target: int -> list[int]\n    pass\n",
      javascript: "function solution(nums, target) {\n  // return indices\n}\n",
      java: "class Solution {\n    public int[] solution(int[] nums, int target) {\n        return new int[0];\n    }\n}\n",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\nvector<int> solution(vector<int>& nums, int target) { return {}; }\n",
      c: "#include <stdio.h>\nvoid solution() {}\n",
      typescript: "function solution(nums: number[], target: number): number[] { return []; }\n",
    },
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1", isHidden: false },
      { input: "3 2 4\n6", expectedOutput: "1 2", isHidden: true },
    ],
    hints: ["Use a hash map to store seen values.", "For each element x, check if target-x exists."],
    expectedTime: "O(n)",
    expectedSpace: "O(n)",
    company: "Amazon",
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    description: "Given a string `s` containing just `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.",
    difficulty: "easy",
    category: "stacks",
    topicSlug: "stacks",
    constraints: "1 <= s.length <= 10^4",
    examples: [{ input: "()", output: "true" }],
    starterCode: {
      python: "def solution(s):\n    pass\n",
      javascript: "function solution(s) {}\n",
    },
    testCases: [
      { input: "()", expectedOutput: "true", isHidden: false },
      { input: "(]", expectedOutput: "false", isHidden: true },
    ],
    hints: ["Use a stack.", "Push opening brackets; pop on closing."],
    expectedTime: "O(n)",
    expectedSpace: "O(n)",
    company: "Google",
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    description: "Given the head of a singly linked list, reverse the list and return the reversed list.",
    difficulty: "medium",
    category: "linked_lists",
    topicSlug: "linked-lists",
    constraints: "0 <= nodes <= 5000",
    examples: [{ input: "1 2 3", output: "3 2 1" }],
    starterCode: { python: "def solution(head):\n    pass\n" },
    testCases: [
      { input: "1 2 3", expectedOutput: "3 2 1", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: true },
    ],
    hints: ["Iterate with prev/current pointers."],
    expectedTime: "O(n)",
    expectedSpace: "O(1)",
    company: "Microsoft",
  },
  {
    slug: "max-depth-binary-tree",
    title: "Maximum Depth of Binary Tree",
    description: "Given the root of a binary tree, return its maximum depth.",
    difficulty: "easy",
    category: "trees",
    topicSlug: "trees",
    constraints: "0 <= nodes <= 10^4",
    examples: [{ input: "1", output: "1" }],
    starterCode: { python: "def solution(n):\n    return 1 if n else 0\n" },
    testCases: [{ input: "1", expectedOutput: "1", isHidden: false }],
    hints: ["DFS or BFS recursion."],
    expectedTime: "O(n)",
    expectedSpace: "O(h)",
    company: "TCS",
  },
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    description: "You climb stairs. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    difficulty: "easy",
    category: "dp",
    topicSlug: "dp",
    constraints: "1 <= n <= 45",
    examples: [{ input: "3", output: "3" }],
    starterCode: { python: "def solution(n):\n    pass\n" },
    testCases: [
      { input: "3", expectedOutput: "3", isHidden: false },
      { input: "5", expectedOutput: "8", isHidden: true },
    ],
    hints: ["Fibonacci pattern."],
    expectedTime: "O(n)",
    expectedSpace: "O(1)",
    company: "Infosys",
  },
];

export async function seedCodingOs() {
  for (const t of TOPICS) {
    await prisma.codeTopic.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name, order: t.order },
      update: { name: t.name, order: t.order },
    });
  }

  for (const name of COMPANIES) {
    await prisma.companyProfile.upsert({
      where: { name },
      create: { name, industry: "Technology" },
      update: {},
    });
  }

  for (const p of PROBLEMS) {
    const topic = await prisma.codeTopic.findUnique({ where: { slug: p.topicSlug } });
    const company = p.company
      ? await prisma.companyProfile.findUnique({ where: { name: p.company } })
      : null;

    const existing = await prisma.codeProblem.findUnique({ where: { slug: p.slug } });
    if (existing) continue;

    const problem = await prisma.codeProblem.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        category: p.category,
        topicId: topic?.id,
        constraints: p.constraints,
        examples: p.examples,
        starterCode: p.starterCode,
        expectedTime: p.expectedTime,
        expectedSpace: p.expectedSpace,
        companyId: company?.id,
        languages: ["python", "java", "cpp", "javascript", "typescript", "c"],
        testCases: {
          create: p.testCases.map((tc, i) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            order: i,
          })),
        },
        hints: { create: p.hints.map((content, order) => ({ content, order })) },
        tags: { create: [{ tag: p.category }, { tag: p.difficulty }] },
      },
    });

    if (company) {
      await prisma.codeProblemCompany.create({
        data: { problemId: problem.id, companyId: company.id },
      });
    }
  }

  // SQL dataset
  await prisma.sqlDataset.upsert({
    where: { slug: "employees-db" },
    create: {
      slug: "employees-db",
      name: "Employees & Departments",
      description: "Practice SELECT, JOIN, GROUP BY on employee records.",
      schemaSql: `CREATE TABLE departments(id INT, name TEXT);
CREATE TABLE employees(id INT, name TEXT, dept_id INT, salary INT);`,
      seedSql: `INSERT INTO departments VALUES (1,'Engineering'),(2,'HR');
INSERT INTO employees VALUES (1,'Alice',1,120000),(2,'Bob',1,95000),(3,'Carol',2,80000);`,
      challenges: {
        create: [
          {
            title: "Average Salary by Department",
            description: "Write a query to return department name and average salary.",
            difficulty: "medium",
            hints: ["Use JOIN and GROUP BY"],
          },
        ],
      },
    },
    update: {},
  });

  // MCQ sample
  const mcqCount = await prisma.mcqQuestion.count();
  if (mcqCount === 0) {
    await prisma.mcqQuestion.createMany({
      data: [
        {
          topic: "arrays",
          difficulty: "easy",
          question: "What is the time complexity of accessing an array element by index?",
          options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
          correctIndex: 0,
          explanation: "Array index access is constant time.",
          tags: ["complexity"],
        },
        {
          topic: "graphs",
          difficulty: "medium",
          question: "Which traversal uses a queue?",
          options: ["DFS", "BFS", "Dijkstra only", "Topological sort only"],
          correctIndex: 1,
          explanation: "BFS explores level by level using a queue.",
          tags: ["graphs"],
        },
      ],
    });
  }

  console.log("Coding OS seed:", TOPICS.length, "topics,", PROBLEMS.length, "problems");
}

if (require.main === module) {
  seedCodingOs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
