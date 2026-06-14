"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getBetaInsights, refreshBetaInsights } from "@/lib/beta-client";

interface InsightsData {
  insights: {
    period: { start: string; end: string; days: number };
    dropOffPoints: Array<{
      stage: string;
      label: string;
      started: number;
      completed: number;
      dropOffCount: number;
      dropOffRate: number;
    }>;
    complaints: Array<{ theme: string; count: number; examples: string[] }>;
    lowestRatedFeatures: Array<{ feature: string; avgRating: number; count: number }>;
    highestRatedFeatures: Array<{ feature: string; avgRating: number; count: number }>;
    interviewCompletionTrend: Array<{ date: string; started?: number; completed?: number; rate?: number }>;
    codingCompletionTrend: Array<{ date: string; started?: number; completed?: number; rate?: number }>;
    placementReadinessTrend: Array<{ date: string; avgScore?: number }>;
    completionMetrics: {
      interviewCompletionRate: number;
      codingCompletionRate: number;
      avgPlacementReadiness: number;
      placementReadinessChange: number;
    };
    feedbackSampleCount: number;
  };
  weeklySummary: {
    weekStart: string;
    weekEnd: string;
    bullets: string[];
    aiGenerated: boolean;
    generatedAt: string;
  };
  weeklyHistory: Array<{
    id: string;
    weekStart: string;
    weekEnd: string;
    bullets: string[];
    aiGenerated: boolean;
    generatedAt: string;
  }>;
}

function TrendChart({
  data,
  lines,
}: {
  data: Array<Record<string, string | number | undefined>>;
  lines: Array<{ key: string; color: string; name: string }>;
}) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No trend data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} name={l.name} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function BetaInsightsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getBetaInsights();
      setData(result as InsightsData);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message === "Forbidden") {
        router.replace("/dashboard/student");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBetaInsights();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">{error || "Could not load insights"}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  const { insights, weeklySummary, weeklyHistory } = data;
  const bullets = Array.isArray(weeklySummary.bullets) ? weeklySummary.bullets : [];

  return (
    <>
      <DashboardHeader user={user} title="Beta Insights" />
      <main className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/beta">
                <ArrowLeft className="mr-2 h-4 w-4" /> Beta Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/beta/ai-quality">AI Quality →</Link>
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Regenerate AI Summary
          </Button>
        </div>

        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Weekly AI Summary
              <Badge variant={weeklySummary.aiGenerated ? "gradient" : "secondary"}>
                {weeklySummary.aiGenerated ? "AI" : "Rule-based"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Week of {new Date(weeklySummary.weekStart).toLocaleDateString()} —{" "}
              {new Date(weeklySummary.generatedAt).toLocaleString()}
            </p>
            {bullets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No summary yet. Collect more beta usage data.</p>
            ) : (
              <ul className="space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Interview Completion</p>
              <p className="text-2xl font-bold">{insights.completionMetrics.interviewCompletionRate}%</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Coding Completion</p>
              <p className="text-2xl font-bold">{insights.completionMetrics.codingCompletionRate}%</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Avg Placement Readiness</p>
              <p className="text-2xl font-bold">{insights.completionMetrics.avgPlacementReadiness}%</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Feedback Samples</p>
              <p className="text-2xl font-bold">{insights.feedbackSampleCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Drop-off Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.dropOffPoints.map((d) => (
                <div key={d.stage} className="rounded-lg border border-border p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{d.label}</span>
                    <Badge variant={d.dropOffRate > 40 ? "destructive" : "warning"}>{d.dropOffRate}% drop-off</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.dropOffCount} of {d.started} users did not complete ({d.completed} finished)
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Most Common Complaints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.complaints.length === 0 && (
                <p className="text-sm text-muted-foreground">No complaints recorded yet.</p>
              )}
              {insights.complaints.slice(0, 6).map((c) => (
                <div key={c.theme} className="flex justify-between text-sm">
                  <span>{c.theme}</span>
                  <Badge variant="secondary">{c.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" /> Lowest Rated Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.lowestRatedFeatures.length === 0 && (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              )}
              {insights.lowestRatedFeatures.map((f) => (
                <div key={f.feature} className="flex justify-between text-sm">
                  <span>{f.feature}</span>
                  <span className="text-rose-500 font-medium">{f.avgRating}/5 ({f.count})</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Highest Rated Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.highestRatedFeatures.length === 0 && (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              )}
              {insights.highestRatedFeatures.map((f) => (
                <div key={f.feature} className="flex justify-between text-sm">
                  <span>{f.feature}</span>
                  <span className="text-emerald-500 font-medium">{f.avgRating}/5 ({f.count})</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Interview Completion Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={insights.interviewCompletionTrend}
                lines={[
                  { key: "started", color: "#8b5cf6", name: "Started" },
                  { key: "completed", color: "#10b981", name: "Completed" },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="glass-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Coding Completion Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={insights.codingCompletionTrend}
                lines={[
                  { key: "started", color: "#f59e0b", name: "Started" },
                  { key: "completed", color: "#10b981", name: "Completed" },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="glass-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Placement Readiness Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={insights.placementReadinessTrend}
                lines={[{ key: "avgScore", color: "#06b6d4", name: "Avg Score" }]}
              />
            </CardContent>
          </Card>
        </div>

        {weeklyHistory.length > 1 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Previous Weekly Summaries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklyHistory.slice(1).map((w) => (
                <div key={w.id} className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Week of {new Date(w.weekStart).toLocaleDateString()}
                    {w.aiGenerated && <Badge variant="outline" className="ml-2">AI</Badge>}
                  </p>
                  <ul className="space-y-1">
                    {(Array.isArray(w.bullets) ? w.bullets : []).slice(0, 4).map((b, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
