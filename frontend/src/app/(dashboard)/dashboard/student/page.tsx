"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ProductTourHint, SetupChecklist } from "@/components/beta/onboarding-panel";
import { StudentJourney } from "@/components/dashboard/student-journey";
import { ROUTES } from "@/lib/routes";
import {
  studentStats,
  learningPaths,
  upcomingAssessments,
  placementDrives,
  chartData,
  aiRecommendations,
  badges,
  codingProblems,
} from "@/lib/mock-data";

const REC_ROUTES: Record<string, string> = {
  course: ROUTES.learnCourses,
  coding: ROUTES.dsaPractice,
  resume: ROUTES.resumeBuilder,
  interview: ROUTES.interviewStart,
};

export default function StudentDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [goals, setGoals] = useState([
    { task: "Solve 2 DSA problems", done: true, xp: 50 },
    { task: "Complete ML module 5", done: true, xp: 100 },
    { task: "30 min mock interview", done: false, xp: 75 },
    { task: "Update resume keywords", done: false, xp: 25 },
  ]);

  const toggleGoal = (index: number) => {
    setGoals((prev) =>
      prev.map((g, i) => (i === index ? { ...g, done: !g.done } : g))
    );
    toast({ title: "Goal updated", variant: "success" });
  };

  const applyDrive = (company: string) => {
    toast({ title: `Applied to ${company}`, description: "Application submitted successfully", variant: "success" });
  };

  return (
    <>
      <DashboardHeader user={user} title="Dashboard" />
      <main className="p-6 space-y-6">
        <WelcomeBanner name={user.name} />
        <StudentJourney currentStepId="learning" completedStepIds={[]} />
        <ProductTourHint />
        <SetupChecklist />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {studentStats.map((stat, i) => (
            <button
              key={stat.title}
              type="button"
              className="text-left"
              onClick={() => router.push(ROUTES.analytics)}
            >
              <StatCard stat={stat} index={i} />
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityChart data={chartData.weeklyActivity} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                Daily Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.map((goal, i) => (
                <button
                  key={goal.task}
                  type="button"
                  className="flex w-full items-center gap-3 text-left hover:bg-accent/5 rounded-lg p-1 -m-1 transition-colors"
                  onClick={() => toggleGoal(i)}
                >
                  <CheckCircle2
                    className={`h-5 w-5 shrink-0 ${
                      goal.done ? "text-emerald-500" : "text-muted-foreground/30"
                    }`}
                  />
                  <div className="flex-1">
                    <p className={`text-sm ${goal.done ? "line-through text-muted-foreground" : ""}`}>
                      {goal.task}
                    </p>
                    <p className="text-xs text-muted-foreground">+{goal.xp} XP</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Learning Paths</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.learnPaths}>View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {learningPaths.map((path) => (
                <button
                  key={path.id}
                  type="button"
                  className="w-full rounded-xl border border-border/50 p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  onClick={() => router.push(ROUTES.learnCourses)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{path.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{path.description}</p>
                    </div>
                    <Badge variant="info">{path.level}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{path.progress}% complete</span>
                      <span>{path.modules} modules</span>
                    </div>
                    <Progress value={path.progress} />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiRecommendations.map((rec) => (
                <button
                  key={rec.title}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-xl bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors"
                  onClick={() => router.push(REC_ROUTES[rec.type] ?? ROUTES.aiCoach)}
                >
                  <Badge
                    variant={rec.priority === "high" ? "destructive" : "warning"}
                    className="shrink-0 mt-0.5"
                  >
                    {rec.priority}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Assessments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAssessments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-border/50 p-3 hover:border-primary/30 transition-colors"
                  onClick={() => {
                    router.push(ROUTES.assessmentsTake);
                    toast({ title: `Opening: ${a.title}`, variant: "success" });
                  }}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.date} · {a.duration}</p>
                  </div>
                  <Badge variant="info">{a.type}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Placement Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {placementDrives.map((drive) => (
                <div key={drive.id} className="rounded-xl border border-border/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{drive.company}</p>
                    <Badge variant={drive.eligible ? "success" : "secondary"}>
                      {drive.eligible ? "Eligible" : "Not Eligible"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{drive.role} · {drive.package}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Deadline: {drive.deadline}
                  </p>
                  {drive.eligible && (
                    <Button size="sm" className="mt-2 w-full" onClick={() => applyDrive(drive.company)}>
                      Apply Now
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Coding Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {codingProblems.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center justify-between hover:bg-accent/5 rounded-lg p-1 -m-1 transition-colors"
                  onClick={() => router.push(ROUTES.codingEditor)}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.topic}</p>
                  </div>
                  <Badge
                    variant={
                      p.solved ? "success" : p.difficulty === "Interview Level" ? "destructive" : "warning"
                    }
                  >
                    {p.solved ? "Solved" : p.difficulty}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Achievements & Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {badges.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  className={`flex flex-col items-center rounded-2xl border p-4 w-32 transition-all hover:scale-105 ${
                    badge.earned
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/50 opacity-50 grayscale"
                  }`}
                  onClick={() => router.push(ROUTES.leaderboardAchievements)}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-lg font-bold">
                    {badge.earned ? "🏆" : "🔒"}
                  </div>
                  <p className="mt-2 text-sm font-medium text-center">{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    {badge.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
