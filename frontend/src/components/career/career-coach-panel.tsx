"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { careerOsApi } from "@/lib/career-os-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NextActionsList, TwinActivityFeed } from "@/components/dashboard/twin-activity-feed";

export function CareerCoachPanel() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    careerOsApi.overview().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const velocity = data?.learningVelocity as { score?: number; tier?: string } | undefined;
  const forecast = (data?.placementForecast as Array<{ horizonDays?: number; probability?: number }>) || [];
  const daily = data?.dailyMission as { title?: string; tasks?: Array<{ title: string }> } | null;
  const twin = data?.twinSummary as {
    strengths?: string[];
    weaknesses?: string[];
    codingReadiness?: number;
    interviewReadiness?: number;
  } | null;
  const coachMessage = data?.coachMessage as string | undefined;
  const activity = (data?.twinActivity as Array<{ id: string; label: string; at: string; summary?: string; trigger: string }>) || [];
  const readinessDelta = data?.readinessDelta as {
    current: number;
    delta: number;
    trend: "up" | "down" | "flat";
    previous: number | null;
  } | undefined;
  const nextActions = (data?.nextBestActions as Array<{ title: string; href: string; priority: string }>) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Your AI Career Manager — remembers your twin, not generic chat</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {coachMessage && (
        <Card className="glass-card border-violet-500/20 bg-violet-500/5">
          <CardContent className="p-4 flex gap-3">
            <Sparkles className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">{coachMessage}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Placement Readiness", value: data?.placementReadiness, color: "text-emerald-600" },
          { label: "Current Potential", value: data?.currentPotential, color: "text-violet-600" },
          { label: "Coding Readiness", value: twin?.codingReadiness, color: "text-cyan-600" },
          { label: "Interview Readiness", value: twin?.interviewReadiness, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>
                {loading ? "…" : s.value != null ? `${s.value}%` : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Twin memory</CardTitle>
          </CardHeader>
          <CardContent>
            <TwinActivityFeed activity={activity} readinessDelta={readinessDelta} />
            {(twin?.strengths?.length || twin?.weaknesses?.length) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {twin?.strengths?.slice(0, 4).map((s) => (
                  <Badge key={s} variant="success" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
                {twin?.weaknesses?.slice(0, 3).map((w) => (
                  <Badge key={w} variant="warning" className="text-[10px]">
                    fix: {w}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Do this next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NextActionsList actions={nextActions} />
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/ai-coach">Full AI coach & roadmap</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Action Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!daily && !loading && (
              <Button onClick={() => careerOsApi.generateMissions().then(load)}>Generate today&apos;s missions</Button>
            )}
            <p className="text-sm font-medium">{daily?.title || "No mission yet"}</p>
            {(daily?.tasks || []).slice(0, 4).map((t, i) => (
              <div key={i} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                {t.title}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Placement Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {forecast.map((p) => (
              <div key={p.horizonDays}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{p.horizonDays} days</span>
                  <span className="font-semibold">{p.probability}%</span>
                </div>
                <Progress value={p.probability || 0} className="h-2" />
              </div>
            ))}
            {!forecast.length && !loading && (
              <p className="text-sm text-muted-foreground">Practice interviews and coding to unlock forecast.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
