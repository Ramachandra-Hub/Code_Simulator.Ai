import type { CodeLanguage, CodeVerdict } from "@prisma/client";
import { judge0Client } from "../career-intelligence/integrations/judge0-client";
import { prisma } from "../core/db/prisma";
import { verdictFromJudgeStatus } from "./constants";

export interface CaseResult {
  caseId: string;
  input: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  runtimeMs?: number;
  memoryKb?: number;
  isHidden: boolean;
}

export interface JudgeRunResult {
  stdout: string | null;
  stderr: string | null;
  verdict: CodeVerdict;
  runtimeMs: number | null;
  memoryKb: number | null;
  source: string;
}

function wrapPython(code: string, stdin: string): string {
  return `${code}\n\nimport sys\n_input = sys.stdin.read().strip().split()\nif _input and _input != ['']:\n    print(solution(*_input) if 'solution' in dir() else solution(_input), end='')`;
}

function buildRunnable(code: string, language: CodeLanguage, stdin: string): { code: string; stdin: string } {
  if (language === "python") {
    const hasSolution = /def\s+solution/.test(code);
    if (hasSolution && stdin.trim()) {
      return { code: wrapPython(code, stdin), stdin };
    }
  }
  return { code, stdin };
}

export async function runCodeAgainstInput(
  code: string,
  language: CodeLanguage,
  stdin: string
): Promise<JudgeRunResult> {
  const runnable = buildRunnable(code, language, stdin);
  const result = await judge0Client.submit(runnable.code, language, runnable.stdin);
  const verdict = verdictFromJudgeStatus(result.status?.id ?? 0);
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    verdict,
    runtimeMs: result.time ? parseFloat(result.time) * 1000 : null,
    memoryKb: result.memory ?? null,
    source: result.source,
  };
}

export async function evaluateAgainstTestCases(
  userId: string,
  problemId: string,
  code: string,
  language: CodeLanguage,
  opts?: { contestId?: string; assignmentId?: string }
) {
  const problem = await prisma.codeProblem.findUnique({
    where: { id: problemId },
    include: { testCases: { orderBy: { order: "asc" } } },
  });
  if (!problem) throw new Error("Problem not found");

  const caseResults: CaseResult[] = [];
  let maxRuntime = 0;
  let maxMemory = 0;

  for (const tc of problem.testCases) {
    const run = await runCodeAgainstInput(code, language, tc.input);
    const actual = (run.stdout || "").trim();
    const expected = tc.expectedOutput.trim();
    const passed = run.verdict === "accepted" && actual === expected;
    if (run.runtimeMs) maxRuntime = Math.max(maxRuntime, run.runtimeMs);
    if (run.memoryKb) maxMemory = Math.max(maxMemory, run.memoryKb);
    caseResults.push({
      caseId: tc.id,
      input: tc.isHidden ? "[hidden]" : tc.input,
      expected: tc.isHidden ? "[hidden]" : expected,
      actual: tc.isHidden && !passed ? "[hidden]" : actual,
      passed,
      runtimeMs: run.runtimeMs ?? undefined,
      memoryKb: run.memoryKb ?? undefined,
      isHidden: tc.isHidden,
    });
  }

  const passedCases = caseResults.filter((c) => c.passed).length;
  const totalCases = caseResults.length;
  const verdict: CodeVerdict =
    passedCases === totalCases && totalCases > 0 ? "accepted" : passedCases === 0 ? "wrong_answer" : "wrong_answer";

  const submission = await prisma.codeProblemSubmission.create({
    data: {
      userId,
      problemId,
      language,
      code,
      verdict,
      passedCases,
      totalCases,
      runtimeMs: maxRuntime || null,
      memoryKb: maxMemory || null,
      caseResults: caseResults as object,
      contestId: opts?.contestId,
      assignmentId: opts?.assignmentId,
    },
  });

  return { submission, caseResults, passedCases, totalCases, verdict };
}

export async function recordRun(
  userId: string,
  input: {
    problemId?: string;
    language: CodeLanguage;
    code: string;
    stdin?: string;
  }
) {
  const run = await runCodeAgainstInput(input.code, input.language, input.stdin || "");
  return prisma.codeProblemRun.create({
    data: {
      userId,
      problemId: input.problemId,
      language: input.language,
      code: input.code,
      stdin: input.stdin,
      stdout: run.stdout,
      stderr: run.stderr,
      verdict: run.verdict,
      runtimeMs: run.runtimeMs,
      memoryKb: run.memoryKb,
    },
  });
}
