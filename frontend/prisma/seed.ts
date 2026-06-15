import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCodingOs } from "./seed-coding-os";

const prisma = new PrismaClient();

async function main() {
  const demos: Array<{ email: string; password: string; name: string; role: UserRole }> = [
    { email: "arjun@nexusedge.edu", password: "demo1234", name: "Arjun Mehta", role: "student" },
    { email: "alex@nexusedge.ai", password: "demo1234", name: "Alex Chen", role: "super_admin" },
    { email: "priya@nexusedge.edu", password: "demo1234", name: "Priya Sharma", role: "faculty" },
    { email: "raj@nexusedge.edu", password: "demo1234", name: "Raj Kumar", role: "placement_officer" },
    { email: "sneha@nexusedge.edu", password: "demo1234", name: "Sneha Patel", role: "training_coordinator" },
    { email: "mike@techcorp.com", password: "demo1234", name: "Mike Johnson", role: "recruiter" },
    { email: "admin@nexusedge.edu", password: "demo1234", name: "College Admin", role: "college_admin" },
  ];

  for (const demo of demos) {
    await prisma.user.upsert({
      where: { email: demo.email },
      create: {
        email: demo.email,
        name: demo.name,
        role: demo.role,
        passwordHash: await bcrypt.hash(demo.password, 12),
        profile: demo.role === "student" ? {
          create: {
            institution: "IIT Delhi",
            department: "Computer Science",
            careerGoal: "Software Engineer",
            skills: ["JavaScript", "Python", "React", "DSA"],
          },
        } : undefined,
      },
      update: {},
    });
  }

  const bank = await prisma.questionBank.upsert({
    where: { id: "default-bank" },
    create: { id: "default-bank", name: "Default Question Bank", category: "general" },
    update: {},
  });

  const questions = [
    { type: "technical" as const, difficulty: "medium", question: "Explain a challenging project from your resume." },
    { type: "hr" as const, difficulty: "easy", question: "Tell me about yourself." },
    { type: "behavioral" as const, difficulty: "medium", question: "Describe a time you handled a tight deadline." },
    { type: "coding" as const, difficulty: "medium", question: "Find two numbers that sum to a target in an array." },
    { type: "system_design" as const, difficulty: "hard", question: "Design a URL shortener." },
  ];

  for (const q of questions) {
    await prisma.interviewQuestion.create({
      data: { bankId: bank.id, ...q, tags: [q.type] },
    });
  }

  console.log("Seed complete:", demos.length, "users,", questions.length, "questions");
  await seedCodingOs();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
