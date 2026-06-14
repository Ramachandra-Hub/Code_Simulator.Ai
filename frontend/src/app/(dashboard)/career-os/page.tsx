"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { careerOsApi } from "@/lib/career-os-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CareerOSOverviewPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    careerOsApi.overview().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const velocity = data?.learningVelocity as { score?: number; tier?: string } | undefined;
  const forecast = (data?.placementForecast as Array<{ horizonDays?: number; probability?: number }>) || [];
  const daily = data?.dailyMission as { title?: string; tasks?: Array<{ title: string }> } | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Your AI Career Manager — twin-grounded, not generic advice</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Placement Readiness", value: data?.placementReadiness, color: "text-emerald-600" },
          { label: "Current Potential", value: data?.currentPotential, color: "text-violet-600" },
          { label: "Future Potential", value: data?.futurePotential, color: "text-cyan-600" },
          { label: "Learning Velocity", value: velocity?.score, suffix: velocity?.tier, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>
                {loading ? "…" : s.value != null ? String(s.value) : "—"}
                {s.suffix && <Badge className="ml-2 text-xs capitalize">{s.suffix}</Badge>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Action Plan</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/career-os/missions">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!daily && !loading && (
              <Button onClick={() => careerOsApi.generateMissions().then(load)}>Generate today&apos;s missions</Button>
            )}
            <p className="text-sm font-medium">{daily?.title || "No mission yet"}</p>
            {(daily?.tasks || []).slice(0, 4).map((t, i) => (
              <div key={i} className="rounded-lg border border-border/60 px-3 py-2 text-sm">{t.title}</div>
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
            {!forecast.length && !loading && <p className="text-sm text-muted-foreground">Loading forecast from twin…</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
