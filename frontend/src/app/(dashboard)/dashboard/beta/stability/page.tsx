"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Loader2,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getBetaMonitoring, getBetaStability } from "@/lib/beta-client";

type StabilityData = Awaited<ReturnType<typeof getBetaStability>>;
type MonitoringData = Awaited<ReturnType<typeof getBetaMonitoring>>;

export default function BetaStabilityPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [data, setData] = useState<StabilityData | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState(24);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [result, mon] = await Promise.all([
        getBetaStability(hours),
        getBetaMonitoring(Math.min(hours, 24)),
      ]);
      setData(result);
      setMonitoring(mon);
    } catch (err) {
      if (err instanceof Error && err.message === "Forbidden") {
        router.replace("/dashboard/student");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load stability report");
    } finally {
      setLoading(false);
    }
  }, [hours, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-muted-foreground">{error || "Could not load stability report"}</p>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader user={user} title="Beta Stability" />
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/beta">
              <ArrowLeft className="mr-2 h-4 w-4" /> Beta Dashboard
            </Link>
          </Button>
          <div className="flex gap-2">
            {[24, 72, 168].map((h) => (
              <Button
                key={h}
                variant={hours === h ? "default" : "outline"}
                size="sm"
                onClick={() => setHours(h)}
              >
                {h === 168 ? "7d" : `${h}h`}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {monitoring && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Error rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{monitoring.monitoring.errorRate.errorRatePercent}%</p>
                <p className="text-xs text-muted-foreground">
                  {monitoring.monitoring.errorRate.totalErrors} errors / {monitoring.monitoring.errorRate.sampledRequests} samples
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">API latency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{monitoring.monitoring.apiLatency.avgMs}ms</p>
                <p className="text-xs text-muted-foreground">p95 {monitoring.monitoring.apiLatency.p95Ms}ms</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ollama latency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{monitoring.monitoring.ollamaLatency.avgMs}ms</p>
                <p className="text-xs text-muted-foreground">p95 {monitoring.monitoring.ollamaLatency.p95Ms}ms</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Database latency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{monitoring.monitoring.databaseLatency.avgMs}ms</p>
                <p className="text-xs text-muted-foreground">p95 {monitoring.monitoring.databaseLatency.p95Ms}ms</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Total Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.crashFrequency.totalErrors}</p>
              <p className="text-xs text-muted-foreground">
                {data.crashFrequency.errorsPerHour}/hr avg
              </p>
            </CardContent>
          </Card>
          {data.crashFrequency.bySource.map((s) => (
            <Card key={s.source} className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{s.source} failures</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{s.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Slowest Pages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.slowestPages.length === 0 && (
                <p className="text-muted-foreground">No page load data yet. Browse the app to collect metrics.</p>
              )}
              {data.slowestPages.map((p) => (
                <div key={p.route} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">{p.route}</span>
                  <span className="shrink-0">
                    avg {p.avgMs}ms · max {p.maxMs}ms ({p.count})
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" /> Slowest APIs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm font-mono text-xs">
              {data.slowestApis.length === 0 && (
                <p className="text-muted-foreground font-sans">No API timing data yet.</p>
              )}
              {data.slowestApis.map((a) => (
                <div key={a.route} className="flex justify-between gap-2">
                  <span className="truncate">{a.route}</span>
                  <span className="shrink-0">
                    avg {a.avgMs}ms ({a.count})
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Performance by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {data.performanceByCategory.length === 0 && (
              <p className="text-muted-foreground col-span-full">No performance metrics recorded.</p>
            )}
            {data.performanceByCategory.map((p) => (
              <div key={p.category} className="rounded-lg border border-border p-3">
                <p className="font-medium capitalize">{p.category.replace(/_/g, " ")}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  avg {p.avgMs}ms · max {p.maxMs}ms · {p.count} samples
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> Most Common Errors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.commonErrors.length === 0 && (
                <p className="text-sm text-muted-foreground">No errors logged in this period.</p>
              )}
              {data.commonErrors.map((e, i) => (
                <div key={i} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <Badge variant="outline">{e.source}</Badge>
                    <span className="text-xs text-muted-foreground">×{e.count}</span>
                  </div>
                  <p className="mt-2 text-muted-foreground break-words">{e.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Recent Errors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {data.recentErrors.length === 0 && (
                <p className="text-sm text-muted-foreground">All clear.</p>
              )}
              {data.recentErrors.map((e) => (
                <div key={e.id} className="rounded border border-border p-2">
                  <div className="flex justify-between gap-2">
                    <Badge variant="secondary">{e.source}</Badge>
                    <span className="text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {e.route && <p className="font-mono mt-1 truncate">{e.route}</p>}
                  <p className="text-muted-foreground mt-1">{e.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
