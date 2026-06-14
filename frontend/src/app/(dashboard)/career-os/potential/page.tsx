"use client";

import { useEffect, useState } from "react";
import { careerOsApi } from "@/lib/career-os-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PotentialPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    careerOsApi.potential().then(setData);
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        { label: "Current Potential", value: data?.currentPotential },
        { label: "Future Potential", value: data?.futurePotential },
        { label: "Growth Ceiling", value: data?.growthCeiling },
        { label: "Leadership Potential", value: data?.leadershipPotential },
        { label: "Technical Potential", value: data?.technicalPotential },
      ].map((s) => (
        <Card key={s.label} className="glass-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-bold text-violet-600">{s.value != null ? String(s.value) : "—"}</p>
          </CardContent>
        </Card>
      ))}
      {data?.tier != null && (
        <Card className="glass-card sm:col-span-2">
          <CardHeader><CardTitle className="text-base">Trajectory Tier</CardTitle></CardHeader>
          <CardContent>
            <Badge className="capitalize text-lg px-4 py-1">{String(data.tier)}</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
