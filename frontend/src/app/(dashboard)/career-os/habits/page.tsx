"use client";

import { useEffect, useState } from "react";
import { careerOsApi } from "@/lib/career-os-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Array<{ habitType: string; streak: number }>>([]);
  const [reminders, setReminders] = useState<string[]>([]);

  const load = () =>
    careerOsApi.habits().then((r) => {
      setHabits((r.habits as typeof habits) || []);
      setReminders((r.reminders as string[]) || []);
    });

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <Card className="glass-card border-amber-500/20">
        <CardHeader><CardTitle className="text-base">Habit Coach</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reminders.map((r, i) => (
            <p key={i} className="text-sm text-muted-foreground">{r}</p>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {habits.map((h) => (
          <Card key={h.habitType} className="glass-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium capitalize">{h.habitType.replace(/_/g, " ")}</p>
                <p className="text-2xl font-bold text-amber-600">{h.streak} day streak</p>
              </div>
              <Button size="sm" onClick={() => careerOsApi.logHabit(h.habitType).then(load)}>Log today</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
