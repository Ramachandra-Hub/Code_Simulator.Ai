"use client";

import { useEffect, useState } from "react";
import { careerOsApi } from "@/lib/career-os-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressPage() {
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    careerOsApi.progress().then((r) => setHistory(r.history as typeof history));
  }, []);

  return (
    <div className="space-y-4">
      {history.map((snap) => (
        <Card key={String(snap.id)} className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {new Date(String(snap.computedAt)).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><span className="text-muted-foreground">Placement</span><p className="font-bold">{String(snap.placementReadiness)}</p></div>
            <div><span className="text-muted-foreground">Technical</span><p className="font-bold">{String(snap.technicalScore)}</p></div>
            <div><span className="text-muted-foreground">Coding</span><p className="font-bold">{String(snap.codingScore)}</p></div>
            <div><span className="text-muted-foreground">Interview</span><p className="font-bold">{String(snap.interviewScore)}</p></div>
          </CardContent>
        </Card>
      ))}
      {!history.length && <p className="text-sm text-muted-foreground">Progress snapshots appear after mission generation.</p>}
    </div>
  );
}
