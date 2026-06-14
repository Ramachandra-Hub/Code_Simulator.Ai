"use client";

import { useRouter } from "next/navigation";
import { Building2, Activity, Sparkles, TrendingUp } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES } from "@/lib/routes";
import { superAdminStats, chartData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useCurrentUser();

  return (
    <>
      <DashboardHeader user={user} title="Super Admin Dashboard" />
      <main className="p-6 space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-cyan-600/10 border border-primary/20 p-8">
          <h2 className="text-2xl font-bold">Platform Overview</h2>
          <p className="text-muted-foreground mt-1">
            Monitor institutions, revenue, AI usage, and system health across the ecosystem.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {superAdminStats.map((stat, i) => (
            <button key={stat.title} type="button" className="text-left" onClick={() => router.push(ROUTES.analytics)}>
              <StatCard stat={stat} index={i} />
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Revenue Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityChart
                data={chartData.revenue.map((r) => ({ month: r.month, revenue: r.revenue / 100000 }))}
                type="bar"
                dataKeys={["revenue"]}
                colors={["#10B981"]}
              />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Top Institutions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "IIT Delhi", students: 12500, placement: 94 },
                { name: "IIT Bombay", students: 11800, placement: 96 },
                { name: "NIT Trichy", students: 8900, placement: 88 },
                { name: "BITS Pilani", students: 7200, placement: 91 },
              ].map((inst) => (
                <button
                  key={inst.name}
                  type="button"
                  className="w-full space-y-2 text-left"
                  onClick={() => router.push(ROUTES.analytics)}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{inst.name}</span>
                    <span className="text-muted-foreground">
                      {inst.students.toLocaleString()} students · {inst.placement}% placed
                    </span>
                  </div>
                  <Progress value={inst.placement} />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                AI Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { feature: "AI Tutor", usage: "2.4M queries" },
                { feature: "Resume Analysis", usage: "890K scans" },
                { feature: "Mock Interviews", usage: "456K sessions" },
                { feature: "Question Generator", usage: "1.2M questions" },
              ].map((item) => (
                <button
                  key={item.feature}
                  type="button"
                  className="flex w-full justify-between items-center hover:bg-accent/5 rounded-lg p-1 transition-colors"
                  onClick={() => router.push(ROUTES.aiCoach)}
                >
                  <span className="text-sm">{item.feature}</span>
                  <Badge variant="gradient">{item.usage}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { service: "API Gateway", status: 99.99 },
                { service: "Code Executor", status: 99.95 },
                { service: "AI Services", status: 99.8 },
                { service: "Database", status: 100 },
              ].map((s) => (
                <button
                  key={s.service}
                  type="button"
                  className="flex w-full items-center justify-between hover:bg-accent/5 rounded-lg p-1 transition-colors"
                  onClick={() => router.push(ROUTES.coding)}
                >
                  <span className="text-sm">{s.service}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{s.status}%</span>
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { plan: "Enterprise", count: 45, revenue: 1800000 },
                { plan: "Professional", count: 128, revenue: 960000 },
                { plan: "Starter", count: 75, revenue: 375000 },
              ].map((p) => (
                <button
                  key={p.plan}
                  type="button"
                  className="flex w-full justify-between rounded-xl border border-border/50 p-3 hover:border-primary/30 transition-colors"
                  onClick={() => router.push(ROUTES.analytics)}
                >
                  <div className="text-left">
                    <p className="font-medium">{p.plan}</p>
                    <p className="text-xs text-muted-foreground">{p.count} institutions</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(p.revenue)}/mo</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
