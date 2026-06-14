"use client";

import { useEffect, useState } from "react";
import { careerOsApi } from "@/lib/career-os-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function ForecastPage() {
  const [predictions, setPredictions] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    careerOsApi.predictions().then((r) => setPredictions(r.predictions as typeof predictions));
  }, []);

  return (
    <div className="space-y-4">
      {predictions.map((p, i) => (
        <Card key={i} className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">{String(p.horizonDays)}-Day Placement Probability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-emerald-600">{String(p.probability)}%</span>
              <Progress value={Number(p.probability) || 0} className="flex-1 h-3" />
            </div>
            {Array.isArray(p.improves) && (p.improves as string[]).length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-emerald-600">What improves probability</p>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {(p.improves as string[]).map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(p.reduces) && (p.reduces as string[]).length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-amber-600">What reduces probability</p>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {(p.reduces as string[]).map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            )}
            {typeof p.factors === "object" && p.factors && (p.factors as { reasoning?: string }).reasoning && (
              <p className="text-xs text-muted-foreground">{(p.factors as { reasoning: string }).reasoning}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
