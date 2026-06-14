"use client";

import { useEffect, useState } from "react";
import { careerOsApi } from "@/lib/career-os-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Array<Record<string, unknown>>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; targetRole: string }>>([]);

  const load = () => careerOsApi.goals().then((r) => {
    setGoals(r.goals as Array<Record<string, unknown>>);
    setTemplates(r.templates as typeof templates);
  });

  useEffect(() => { load(); }, []);

  const pick = async (templateId: string) => {
    await careerOsApi.createGoal({ templateId });
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Choose Your Career Goal</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <Button key={t.id} variant="outline" size="sm" onClick={() => pick(t.id)}>{t.title}</Button>
          ))}
        </CardContent>
      </Card>
      <div className="space-y-3">
        {goals.map((g) => (
          <Card key={String(g.id)} className="glass-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{String(g.title)}</p>
                <p className="text-sm text-muted-foreground">{String(g.targetRole)}</p>
              </div>
              <Badge>{String(g.status)}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
