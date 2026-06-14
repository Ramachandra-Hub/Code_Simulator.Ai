"use client";

import { useRouter } from "next/navigation";
import { Users, GraduationCap, Building2, BarChart3 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES } from "@/lib/routes";
import { chartData } from "@/lib/mock-data";

const collegeStats = [
  { title: "Total Students", value: "3,240", change: 8, changeLabel: "this semester", icon: "Users", gradient: "from-violet-500 to-indigo-600" },
  { title: "Faculty Members", value: "186", change: 3, changeLabel: "active", icon: "GraduationCap", gradient: "from-cyan-500 to-blue-600" },
  { title: "Placement Rate", value: "89%", change: 12, changeLabel: "vs last year", icon: "Building2", gradient: "from-emerald-500 to-teal-600" },
  { title: "Avg Package", value: "₹18.5L", change: 15, changeLabel: "LPA", icon: "TrendingUp", gradient: "from-amber-500 to-orange-600" },
];

export default function CollegeAdminDashboard() {
  const router = useRouter();
  const { user } = useCurrentUser();

  return (
    <>
      <DashboardHeader user={user} title="College Admin Dashboard" />
      <main className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collegeStats.map((stat, i) => (
            <button key={stat.title} type="button" className="text-left" onClick={() => router.push(ROUTES.analytics)}>
              <StatCard stat={stat} index={i} />
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Placement Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityChart data={chartData.placementFunnel} type="bar" dataKeys={["count"]} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Branch Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { branch: "Computer Science", placed: 96, avg: "₹24L" },
                { branch: "Electronics", placed: 82, avg: "₹14L" },
                { branch: "Mechanical", placed: 78, avg: "₹12L" },
                { branch: "Civil", placed: 71, avg: "₹10L" },
              ].map((b) => (
                <button
                  key={b.branch}
                  type="button"
                  className="w-full space-y-2 text-left hover:opacity-80 transition-opacity"
                  onClick={() => router.push(ROUTES.analytics)}
                >
                  <div className="flex justify-between text-sm">
                    <span>{b.branch}</span>
                    <span className="text-muted-foreground">{b.placed}% · {b.avg}</span>
                  </div>
                  <Progress value={b.placed} />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Department Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["CSE", "ECE", "ME", "CE", "EEE"].map((dept, i) => (
                <button
                  key={dept}
                  type="button"
                  className="flex w-full justify-between items-center rounded-xl border border-border/50 p-3 hover:border-primary/30 transition-colors"
                  onClick={() => router.push(ROUTES.analytics)}
                >
                  <span className="font-medium">{dept}</span>
                  <Badge variant="info">{[1240, 680, 520, 410, 390][i]} students</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Assessment Success Rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "DSA Mid-Term", rate: 78 },
                { name: "Aptitude Test", rate: 85 },
                { name: "Technical Round", rate: 62 },
                { name: "Coding Contest", rate: 71 },
              ].map((a) => (
                <button
                  key={a.name}
                  type="button"
                  className="w-full space-y-1 text-left"
                  onClick={() => router.push(ROUTES.assessments)}
                >
                  <div className="flex justify-between text-sm">
                    <span>{a.name}</span>
                    <span>{a.rate}%</span>
                  </div>
                  <Progress value={a.rate} />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Learning Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                className="w-full"
                onClick={() => router.push(ROUTES.learn)}
              >
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-sm"
                      style={{ backgroundColor: `rgba(99, 102, 241, ${0.1 + (i % 7) * 0.1})` }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Click to view learning analytics
                </p>
              </button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
