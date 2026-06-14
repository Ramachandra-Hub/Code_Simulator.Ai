"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, RefreshCw } from "lucide-react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function OfficeOverviewPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    officeApi.overview().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const session = data?.session as { company?: { name?: string; culture?: string }; role?: string; level?: string } | undefined;
  const twin = data?.twinOffice as Record<string, number> | undefined;
  const analytics = data?.analytics as { taskCompletion?: { rate?: number }; meetingParticipation?: { rate?: number } } | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Your virtual workplace — twin-grounded professional simulation</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-card border-blue-500/20">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Building2 className="h-10 w-10 text-blue-500" />
          <div>
            <p className="text-lg font-semibold">{loading ? "…" : session?.company?.name || "Virtual Company"}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {session?.company?.culture} · {session?.role?.replace(/_/g, " ")} · {session?.level}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto">PR-13</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Leadership", value: twin?.leadership, color: "text-indigo-600" },
          { label: "Ownership", value: twin?.ownership, color: "text-emerald-600" },
          { label: "Collaboration", value: twin?.collaboration, color: "text-cyan-600" },
          { label: "Promotion Readiness", value: twin?.promotionReadiness, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{loading ? "…" : s.value != null ? s.value : "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Work</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/office/work">Open <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              ((data?.todayWork as Array<{ title?: string }>) || []).map((t, i) => (
                <p key={i} className="text-sm">• {t.title}</p>
              )) || <p className="text-sm text-muted-foreground">No pending tasks</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Task completion</span>
                <span>{analytics?.taskCompletion?.rate ?? 0}%</span>
              </div>
              <Progress value={analytics?.taskCompletion?.rate ?? 0} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Meeting participation</span>
                <span>{analytics?.meetingParticipation?.rate ?? 0}%</span>
              </div>
              <Progress value={analytics?.meetingParticipation?.rate ?? 0} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
