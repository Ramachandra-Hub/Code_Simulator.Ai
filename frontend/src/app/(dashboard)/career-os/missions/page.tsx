"use client";

import { useEffect, useState } from "react";
import { careerOsApi } from "@/lib/career-os-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Mission = { title?: string; tasks?: Array<{ title: string; type: string; estimatedMinutes: number }> };

export default function MissionsPage() {
  const [daily, setDaily] = useState<Mission | null>(null);
  const [weekly, setWeekly] = useState<Mission | null>(null);
  const [monthly, setMonthly] = useState<Mission | null>(null);

  const load = () =>
    careerOsApi.missions().then((r) => {
      setDaily(r.daily as Mission);
      setWeekly(r.weekly as Mission);
      setMonthly(r.monthly as Mission);
    });

  useEffect(() => { load(); }, []);

  const MissionBlock = ({ label, mission }: { label: string; mission: Mission | null }) => (
    <Card className="glass-card">
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium">{mission?.title || "Not generated"}</p>
        {(mission?.tasks || []).map((t, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 p-3 text-sm">
            <span>{t.title}</span>
            <Badge variant="outline" className="shrink-0 text-[10px]">{t.type} · {t.estimatedMinutes}m</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Button onClick={() => careerOsApi.generateMissions().then(load)}>Regenerate from Digital Twin</Button>
      <MissionBlock label="Daily Mission" mission={daily} />
      <MissionBlock label="Weekly Mission" mission={weekly} />
      <MissionBlock label="Monthly Mission" mission={monthly} />
    </div>
  );
}
