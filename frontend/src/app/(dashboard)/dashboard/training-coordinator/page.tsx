"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, Layers, ClipboardCheck, BarChart3 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES } from "@/lib/routes";
import { learningPaths } from "@/lib/mock-data";

const coordinatorStats = [
  { title: "Active Programs", value: "8", change: 2, changeLabel: "running", icon: "GraduationCap", gradient: "from-violet-500 to-indigo-600" },
  { title: "Total Batches", value: "24", change: 4, changeLabel: "active", icon: "Layers", gradient: "from-cyan-500 to-blue-600" },
  { title: "Enrolled", value: "1,420", change: 18, changeLabel: "students", icon: "Users", gradient: "from-emerald-500 to-teal-600" },
  { title: "Completion Rate", value: "72%", change: 8, changeLabel: "avg", icon: "Target", gradient: "from-amber-500 to-orange-600" },
];

export default function TrainingCoordinatorDashboard() {
  const router = useRouter();
  const { user } = useCurrentUser();

  return (
    <>
      <DashboardHeader user={user} title="Training Coordinator Dashboard" />
      <main className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coordinatorStats.map((stat, i) => (
            <button key={stat.title} type="button" className="text-left" onClick={() => router.push(ROUTES.analytics)}>
              <StatCard stat={stat} index={i} />
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Training Programs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {learningPaths.map((path) => (
                <button
                  key={path.id}
                  type="button"
                  className="w-full rounded-xl border border-border/50 p-4 text-left hover:border-primary/30 transition-colors"
                  onClick={() => router.push(ROUTES.learnCourses)}
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{path.title}</p>
                    <Badge variant="info">{path.level}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{path.duration} · {path.modules} modules</p>
                  <Progress value={path.progress} className="mt-3" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Batch Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { batch: "CSE 2026 - Batch A", progress: 78, students: 60 },
                { batch: "CSE 2026 - Batch B", progress: 65, students: 58 },
                { batch: "ECE 2026 - Batch A", progress: 82, students: 55 },
                { batch: "ME 2026 - Batch A", progress: 54, students: 50 },
              ].map((b) => (
                <button
                  key={b.batch}
                  type="button"
                  className="w-full space-y-2 text-left"
                  onClick={() => router.push(ROUTES.leaderboardRankings)}
                >
                  <div className="flex justify-between text-sm">
                    <span>{b.batch}</span>
                    <span className="text-muted-foreground">{b.students} students · {b.progress}%</span>
                  </div>
                  <Progress value={b.progress} />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Assessment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Scheduled", value: 12, route: ROUTES.assessments },
                { label: "In Progress", value: 3, route: ROUTES.assessmentsTake },
                { label: "Completed", value: 45, route: ROUTES.analytics },
                { label: "Avg Score", value: "74%", route: ROUTES.analytics },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="rounded-xl border border-border/50 p-4 text-center hover:border-primary/30 transition-colors"
                  onClick={() => router.push(item.route)}
                >
                  <ClipboardCheck className="h-6 w-6 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
