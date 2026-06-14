"use client";

import { useEffect, useState } from "react";
import { careerOsApi } from "@/lib/career-os-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    careerOsApi.achievements().then((r) => setAchievements(r.achievements as typeof achievements));
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {achievements.map((a) => (
        <Card key={String(a.id)} className="glass-card">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-3xl">{String(a.badge || "🏆")}</span>
            <div>
              <p className="font-semibold">{String(a.title)}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] capitalize">{String(a.category)}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(String(a.achievedAt)).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {!achievements.length && <p className="text-sm text-muted-foreground">Complete missions and hit twin milestones to earn badges.</p>}
    </div>
  );
}
