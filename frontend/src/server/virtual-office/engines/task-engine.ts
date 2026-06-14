export type WorkTaskType = "bug_fix" | "feature" | "refactoring" | "documentation" | "architecture";

export interface TaskTemplate {
  title: string;
  type: WorkTaskType;
  description: string;
  priority: number;
}

const ROLE_TASKS: Record<string, TaskTemplate[]> = {
  software_engineer: [
    { title: "Fix null pointer in auth middleware", type: "bug_fix", description: "Users intermittently lose session on token refresh. Trace the middleware chain and add defensive checks.", priority: 2 },
    { title: "Add pagination to user search API", type: "feature", description: "Product needs cursor-based pagination on /api/users/search with stable ordering.", priority: 1 },
    { title: "Extract validation helpers from controllers", type: "refactoring", description: "Duplicate Zod schemas across 4 controllers — consolidate into shared validators.", priority: 0 },
    { title: "Document onboarding runbook", type: "documentation", description: "Write a 1-page runbook for new engineers covering local setup and deploy flow.", priority: 0 },
  ],
  qa_engineer: [
    { title: "Reproduce flaky E2E on checkout flow", type: "bug_fix", description: "CI fails ~15% on payment step. Capture traces and isolate race condition.", priority: 2 },
    { title: "Add regression suite for billing webhooks", type: "feature", description: "Cover success, retry, and idempotency scenarios for Stripe webhooks.", priority: 1 },
    { title: "Refactor test fixtures for speed", type: "refactoring", description: "Parallelize DB seed fixtures to cut suite time under 4 minutes.", priority: 1 },
    { title: "Update QA test plan for sprint 14", type: "documentation", description: "Map acceptance criteria to automated and manual test cases.", priority: 0 },
  ],
  product_manager: [
    { title: "Clarify acceptance criteria for notifications", type: "documentation", description: "Engineering blocked on push vs email priority — finalize PRD section 3.2.", priority: 2 },
    { title: "Define success metrics for onboarding v2", type: "feature", description: "Specify activation funnel events and target conversion rates.", priority: 1 },
    { title: "Triage customer-reported UX friction", type: "bug_fix", description: "Synthesize top 5 support tickets into actionable backlog items.", priority: 1 },
    { title: "Architecture review prep for scale plan", type: "architecture", description: "Draft non-functional requirements for 10x traffic scenario.", priority: 0 },
  ],
  team_lead: [
    { title: "Unblock dependency on shared auth library", type: "architecture", description: "Coordinate with platform team on semver bump and migration timeline.", priority: 2 },
    { title: "Split monolithic service module", type: "refactoring", description: "Propose bounded context boundaries for payments domain.", priority: 1 },
    { title: "Review sprint capacity vs commitments", type: "documentation", description: "Update team capacity sheet and flag overcommit risks.", priority: 1 },
    { title: "Mentor junior on code review feedback", type: "feature", description: "Pair on PR #842 — focus on error handling patterns.", priority: 0 },
  ],
};

const DEFAULT_TASKS = ROLE_TASKS.software_engineer;

export function generateTasksForRole(role: string, count = 4): TaskTemplate[] {
  const pool = ROLE_TASKS[role] || DEFAULT_TASKS;
  return pool.slice(0, count);
}

export function taskTypeLabel(type: WorkTaskType): string {
  const labels: Record<WorkTaskType, string> = {
    bug_fix: "Bug Fix",
    feature: "Feature",
    refactoring: "Refactoring",
    documentation: "Documentation",
    architecture: "Architecture",
  };
  return labels[type];
}
