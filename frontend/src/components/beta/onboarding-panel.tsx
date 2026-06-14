"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getOnboarding, patchOnboarding } from "@/lib/beta-client";
import { ROUTES } from "@/lib/routes";

const STEPS = [
  { key: "profile", label: "Complete your profile", href: ROUTES.profile },
  { key: "resume", label: "Build your resume", href: ROUTES.resumeBuilder },
  { key: "interview", label: "Take a mock interview", href: ROUTES.interviewStart },
  { key: "twin", label: "View intelligence profile", href: ROUTES.twin },
  { key: "careerCoach", label: "Run AI career coach", href: ROUTES.aiCoach },
] as const;

export function OnboardingWelcome() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getOnboarding().then((o) => {
        if (!o.welcomeSeen) setShow(true);
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = async () => {
    await patchOnboarding({ welcomeSeen: true });
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Welcome to NexusEdge Beta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You&apos;re among the first students testing our AI career platform. Complete the setup checklist to get the most from mock interviews, resume analysis, and your digital twin.
          </p>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Build a resume, then start a technical interview</li>
            <li>• AI analysis takes 15–30 seconds per answer (Ollama)</li>
            <li>• Use Chrome/Edge for voice input</li>
            <li>• Report issues anytime via the Feedback button</li>
          </ul>
          <Button className="w-full" variant="gradient" onClick={dismiss}>
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function SetupChecklist() {
  const router = useRouter();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getOnboarding().then((o) => setChecklist((o.checklist as Record<string, boolean>) || {}));
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const done = STEPS.filter((s) => checklist[s.key]).length;
  const pct = Math.round((done / STEPS.length) * 100);

  if (hidden || done === STEPS.length) return null;

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Beta Setup Checklist</CardTitle>
        <button type="button" onClick={() => setHidden(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{done} of {STEPS.length} complete</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <ul className="space-y-2">
          {STEPS.map((step) => (
            <li key={step.key}>
              <button
                type="button"
                className="flex items-center gap-2 text-sm w-full text-left hover:text-primary transition-colors"
                onClick={() => router.push(step.href)}
              >
                {checklist[step.key] ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {step.label}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ProductTourHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    getOnboarding().then((o) => {
      if (o.welcomeSeen && !o.tourCompleted) setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-sm">
        <strong>Quick tour:</strong> Use the sidebar — Resume → Mock Interview → Intelligence Profile → AI Coach.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await patchOnboarding({ tourCompleted: true });
          setShow(false);
        }}
      >
        Got it
      </Button>
    </div>
  );
}
