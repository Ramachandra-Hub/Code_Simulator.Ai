"use client";

import { useEffect, useState } from "react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Assessment = {
  ready: boolean;
  score: number;
  gaps?: string[];
  recommendation?: string;
  createdAt: string;
};

export default function OfficePromotionPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [dimensions, setDimensions] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => officeApi.promotion().then((d) => setAssessments((d.assessments as Assessment[]) || []));

  useEffect(() => { load(); }, []);

  const assess = async () => {
    setLoading(true);
    try {
      const result = await officeApi.runPromotionAssessment();
      setDimensions((result.dimensions as Record<string, number>) || null);
      load();
    } finally {
      setLoading(false);
    }
  };

  const latest = assessments[0];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Promotion readiness synthesized from standups, tasks, reviews, and twin signals</p>

      <Button onClick={assess} disabled={loading}>Run promotion assessment</Button>

      {latest && (
        <Card className="glass-card border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Latest assessment
              <Badge variant={latest.ready ? "default" : "secondary"}>
                {latest.ready ? "Promotion ready" : "Developing"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{latest.score}/100</p>
            {latest.gaps && (latest.gaps as string[]).length > 0 && (
              <p className="text-sm">Gaps: {(latest.gaps as string[]).join(", ")}</p>
            )}
            <p className="text-sm text-muted-foreground">{latest.recommendation}</p>
          </CardContent>
        </Card>
      )}

      {dimensions && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Dimension breakdown</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {Object.entries(dimensions).filter(([k]) => k !== "summary").map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
