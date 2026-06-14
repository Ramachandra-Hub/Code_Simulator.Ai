"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Mic, FileText, Rocket, Building2, GraduationCap, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  completed?: boolean;
  current?: boolean;
}

interface StudentJourneyProps {
  currentStepId?: string;
  completedStepIds?: string[];
}

const JOURNEY_STEPS: Omit<JourneyStep, "completed" | "current">[] = [
  {
    id: "learning",
    title: "Learning",
    description: "Courses, coding lab, and DSA practice",
    href: ROUTES.learn,
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    id: "assessment",
    title: "Assessment",
    description: "Test your skills with AI-evaluated quizzes",
    href: ROUTES.assessmentsTake,
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    id: "resume",
    title: "Resume",
    description: "Build and optimize your resume for ATS",
    href: ROUTES.resumeBuilder,
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "interview",
    title: "Interview",
    description: "Practice voice interviews in the AI meeting room",
    href: ROUTES.interviewStart,
    icon: <Mic className="h-5 w-5" />,
  },
  {
    id: "career-coach",
    title: "Career Coach",
    description: "Goals, missions, and placement readiness",
    href: "/career-os",
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    id: "workplace",
    title: "Workplace AI",
    description: "Simulate real corporate work before your first job",
    href: "/office",
    icon: <Building2 className="h-5 w-5" />,
  },
];

export function StudentJourney({ currentStepId = "learning", completedStepIds = [] }: StudentJourneyProps) {
  const steps: JourneyStep[] = JOURNEY_STEPS.map((s) => ({
    ...s,
    completed: completedStepIds.includes(s.id),
    current: s.id === currentStepId,
  }));

  const current = steps.find((s) => s.current) || steps[0];
  const next = steps[steps.findIndex((s) => s.id === current.id) + 1];

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your placement journey</CardTitle>
        <p className="text-xs text-muted-foreground">Follow this path — always know what to do next</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-1 sm:gap-0">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                  step.current && "bg-primary/10 text-primary",
                  step.completed && !step.current && "text-emerald-600",
                  !step.current && !step.completed && "text-muted-foreground hover:text-foreground"
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : step.current ? (
                  <Circle className="h-4 w-4 fill-primary text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </Link>
              {i < steps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-muted/40 border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{current.title}</p>
            <p className="text-xs text-muted-foreground">{current.description}</p>
          </div>
          <Button asChild size="sm" variant="gradient">
            <Link href={current.href}>
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {next && (
          <p className="text-xs text-muted-foreground text-center">
            Up next: <Link href={next.href} className="text-primary underline">{next.title}</Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
