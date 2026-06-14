"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
import { completeRoadmapItem, recordRecommendationOutcome } from "@/lib/beta-client";
import { useToast } from "@/hooks/use-toast";

interface CoachResults {
  profile: { strengths: string[]; weaknesses: string[]; placementScore: number } | null;
  recommendations: Array<{ id: string; title: string; description: string | null; priority: number; status: string }>;
  roadmap: {
    id: string;
    title: string;
    targetRole: string | null;
    items: Array<{ id: string; title: string; type: string; status: string; priority: number }>;
  } | null;
  placementReadiness: { overallScore: number; skillGaps: Record<string, number> | null } | null;
}

export function CareerCoachPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<CoachResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [actedOn, setActedOn] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    apiFetch<CoachResults>("/career/recommendations")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runCoach = async () => {
    setRunning(true);
    try {
      await apiFetch("/career/coach", { method: "POST" });
      load();
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={runCoach} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh Coach
        </Button>
      </div>

      {data?.placementReadiness && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Placement Readiness</span>
              <span className="font-bold text-primary">{Math.round(data.placementReadiness.overallScore)}/100</span>
            </div>
            <Progress value={data.placementReadiness.overallScore} />
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data?.recommendations?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Run Career Coach to generate recommendations.</p>
          ) : (
            data.recommendations.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium">{r.title}</p>
                  <Badge variant={r.priority >= 8 ? "destructive" : r.priority >= 5 ? "warning" : "secondary"}>
                    {r.priority >= 8 ? "High" : r.priority >= 5 ? "Medium" : "Low"}
                  </Badge>
                </div>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                {!actedOn.has(r.id) && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={async () => {
                        await recordRecommendationOutcome({ recommendationId: r.id, title: r.title, action: "accepted" });
                        setActedOn((s) => new Set(s).add(r.id));
                        toast({ title: "Marked as accepted", variant: "success" });
                      }}
                    >
                      I&apos;ll do this
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={async () => {
                        await recordRecommendationOutcome({ recommendationId: r.id, title: r.title, action: "dismissed" });
                        setActedOn((s) => new Set(s).add(r.id));
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {data?.roadmap && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="h-4 w-4 text-violet-500" /> {data.roadmap.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.roadmap.items.map((item, i) => (
              <div key={item.id} className="flex gap-3 text-sm p-2 rounded-lg bg-muted/20 items-start justify-between">
                <div className="flex gap-3">
                  <span className="text-primary font-bold">{i + 1}</span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type} · {item.status}</p>
                  </div>
                </div>
                {item.status !== "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={async () => {
                      await completeRoadmapItem(item.id);
                      load();
                      toast({ title: "Roadmap item completed", variant: "success" });
                    }}
                  >
                    Done
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function CareerSkillGapPanel() {
  const [gaps, setGaps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ placementReadiness: { skillGaps: Record<string, number> | null } | null }>("/career/recommendations")
      .then((d) => setGaps(d.placementReadiness?.skillGaps || {}))
      .catch(() => setGaps({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const entries = Object.entries(gaps);
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">No skill gaps identified. Run Career Coach first.</p>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      {entries.map(([skill, gap]) => (
        <div key={skill} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium capitalize">{skill.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground">-{gap} pts to target</span>
          </div>
          <Progress value={Math.max(0, 100 - gap)} />
        </div>
      ))}
    </div>
  );
}
