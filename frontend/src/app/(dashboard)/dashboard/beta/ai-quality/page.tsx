"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
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
} from "recharts";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getAiQualityDashboard, refreshAiQualityReport } from "@/lib/beta-client";

export default function AiQualityPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getAiQualityDashboard();
      setData(result as Record<string, unknown>);
    } catch (err) {
      if (err instanceof Error && err.message === "Forbidden") {
        router.replace("/dashboard/student");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not reach server. Is the dev server running?");
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
      await refreshAiQualityReport();
      await load();
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

  const dashboard = data?.dashboard as Record<string, unknown> | undefined;
  const weekly = data?.weeklyReport as { bullets: string[]; aiGenerated: boolean; generatedAt: string } | undefined;

  if (error || !dashboard) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">{error || "Could not load AI quality data."}</p>
        <Button onClick={() => { setLoading(true); load(); }}>Retry</Button>
      </div>
    );
  }

  const interviewQ = dashboard.interviewQuality as Record<string, number>;
  const coachQ = dashboard.coachQuality as Record<string, number>;
  const bestQ = (dashboard.bestQuestions as Array<Record<string, unknown>>) || [];
  const worstQ = (dashboard.worstQuestions as Array<Record<string, unknown>>) || [];
  const bestR = (dashboard.bestRecommendations as Array<Record<string, unknown>>) || [];
  const worstR = (dashboard.worstRecommendations as Array<Record<string, unknown>>) || [];
  const improvement = dashboard.studentImprovement as {
    improving: number;
    declining: number;
    trend: Array<{ date: string; avgPlacement: number }>;
  };
  const bullets = Array.isArray(weekly?.bullets) ? weekly.bullets : [];

  return (
    <>
      <DashboardHeader user={user} title="AI Quality" />
      <main className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/beta/insights">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Beta Insights
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Regenerate Weekly Report
          </Button>
        </div>

        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-primary" />
              Weekly AI Improvement Report
              {weekly?.aiGenerated && <Badge variant="gradient">Ollama</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bullets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Collect more beta usage to generate improvement insights.</p>
            ) : (
              <ul className="space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card"><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Question Completion</p><p className="text-2xl font-bold">{interviewQ.questionCompletionRate}%</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Abandon Rate</p><p className="text-2xl font-bold">{interviewQ.questionSkipRate}%</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Rec. Acceptance</p><p className="text-2xl font-bold">{coachQ.acceptanceRate}%</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Roadmap Completion</p><p className="text-2xl font-bold">{coachQ.roadmapCompletionRate}%</p></CardContent></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-emerald-500" /> Best Interview Questions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {bestQ.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
              {bestQ.map((q, i) => (
                <div key={i} className="text-sm border-b border-border/50 pb-2">
                  <p className="font-medium line-clamp-2">{String(q.question)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Score {String(q.score)}/100 · {String(q.completionRate)}% completion</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-rose-500" /> Worst Interview Questions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {worstQ.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
              {worstQ.map((q, i) => (
                <div key={i} className="text-sm border-b border-border/50 pb-2">
                  <p className="font-medium line-clamp-2">{String(q.question)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Score {String(q.score)}/100 · {String(q.abandoned)} abandonments</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Most Useful Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {bestR.map((r, i) => (
                <div key={i} className="flex justify-between text-sm gap-2">
                  <span className="line-clamp-1">{String(r.title)}</span>
                  <Badge variant="success">{String(r.adoptionRate)}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Least Useful Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {worstR.map((r, i) => (
                <div key={i} className="flex justify-between text-sm gap-2">
                  <span className="line-clamp-1">{String(r.title)}</span>
                  <Badge variant="secondary">{String(r.ignored)} ignored</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Student Improvement Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {improvement.improving} improving · {improvement.declining} declining
            </p>
            {improvement.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={improvement.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgPlacement" stroke="#8b5cf6" strokeWidth={2} name="Avg Placement" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No placement trend data yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
