import { prisma } from "../core/db/prisma";

export const DEFAULT_CHECKLIST = {
  profile: false,
  resume: false,
  interview: false,
  twin: false,
  careerCoach: false,
} as const;

export type ChecklistKey = keyof typeof DEFAULT_CHECKLIST;

export async function getOrCreateOnboarding(userId: string) {
  const existing = await prisma.userOnboarding.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userOnboarding.create({
    data: {
      userId,
      firstLoginAt: new Date(),
      checklist: DEFAULT_CHECKLIST as object,
    },
  });
}

export async function markWelcomeSeen(userId: string) {
  await getOrCreateOnboarding(userId);
  return prisma.userOnboarding.update({
    where: { userId },
    data: { welcomeSeen: true },
  });
}

export async function markTourCompleted(userId: string) {
  await getOrCreateOnboarding(userId);
  return prisma.userOnboarding.update({
    where: { userId },
    data: { tourCompleted: true },
  });
}

export async function updateChecklistItem(userId: string, key: ChecklistKey, done = true) {
  const record = await getOrCreateOnboarding(userId);
  const checklist = { ...(record.checklist as Record<string, boolean>), [key]: done };
  return prisma.userOnboarding.update({
    where: { userId },
    data: { checklist: checklist as object },
  });
}

export async function getOnboarding(userId: string) {
  return getOrCreateOnboarding(userId);
}
