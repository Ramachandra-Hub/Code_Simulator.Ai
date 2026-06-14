"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Download,
  Loader2,
  MessageSquare,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getBetaDashboard, type BetaDashboardData } from "@/lib/beta-client";

type BetaStats = BetaDashboardData["stats"];
type PerfSummary = BetaDashboardData["performance"];

export default function BetaDashboardPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [performance, setPerformance] = useState<PerfSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBetaDashboard()
      .then((data) => {
        setStats(data.stats);
        setPerformance(data.performance);
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "Forbidden") {
          router.replace("/dashboard/student");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {error || "Could not load beta dashboard"}
      </div>
    );
  }

  const statCards = [
    { title: "Active Users (7d)", value: String(stats.activeUsers), changeLabel: stats.period, icon: "Users", gradient: "from-blue-500 to-cyan-500" },
    { title: "Interviews Completed", value: String(stats.interviewsCompleted), changeLabel: `${stats.completionRate}% completion`, icon: "Mic", gradient: "from-violet-500 to-purple-500" },
    { title: "Coding Rounds Done", value: String(stats.codingRoundsCompleted), changeLabel: "7-day window", icon: "Code2", gradient: "from-emerald-500 to-teal-500" },
    { title: "Career Coach Opens", value: String(stats.careerCoachOpens), changeLabel: `${stats.pdfDownloads} PDFs`, icon: "Sparkles", gradient: "from-fuchsia-500 to-pink-500" },
    { title: "Avg Placement Readiness", value: `${stats.averagePlacementReadiness}%`, changeLabel: "rolling 7d", icon: "Target", gradient: "from-amber-500 to-orange-500" },
    { title: "Interviews Started", value: String(stats.interviewsStarted), changeLabel: "funnel top", icon: "Activity", gradient: "from-rose-500 to-red-500" },
  ];

  return (
    <>
      <DashboardHeader user={user} title="Beta Dashboard" />
      <main className="p-6 space-y-6">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">
              Beta metrics for the last <strong>7 days</strong>. Use this dashboard to monitor student adoption before scaling to 25–50 testers.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/beta/stability">
                <Activity className="mr-2 h-4 w-4" /> Stability
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/beta/insights">
                <Sparkles className="mr-2 h-4 w-4" /> AI Insights
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((s, i) => (
            <StatCard key={s.title} stat={s} index={i} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" /> Event Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.eventBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              )}
              {stats.eventBreakdown.map((e) => (
                <div key={e.event} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{e.event.replace(/_/g, " ")}</span>
                  <Badge variant="secondary">{e.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" /> Performance (24h)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!performance?.summary.length && (
                <p className="text-sm text-muted-foreground">No performance data yet.</p>
              )}
              {performance?.summary.map((p) => (
                <div key={p.category} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{p.category}</span>
                  <span>avg {p.avgMs}ms · max {p.maxMs}ms ({p.count})</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Recent Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentFeedback.length === 0 && (
              <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
            )}
            {stats.recentFeedback.map((f) => (
              <div key={f.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="font-medium">{f.user.name}</span>
                  <Badge variant="outline">{f.type.replace(/_/g, " ")}</Badge>
                </div>
                {f.rating && <p className="text-xs text-amber-600 mt-1">{f.rating}/5 stars</p>}
                {f.message && <p className="text-muted-foreground mt-1">{f.message}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(f.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {performance?.recent && performance.recent.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Recent Slow Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs font-mono">
              {performance.recent.slice(0, 15).map((r, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="truncate">{r.route}</span>
                  <span className="shrink-0">{r.durationMs}ms</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
