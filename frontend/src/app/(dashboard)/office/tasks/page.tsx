"use client";

import { useEffect, useState } from "react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Task = { id: string; title: string; type: string; description: string; status: string; priority: number };

export default function OfficeTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => officeApi.tasks().then((d) => setTasks((d.tasks as Task[]) || []));

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setLoading(true);
    try {
      await officeApi.generateTasks();
      load();
    } finally {
      setLoading(false);
    }
  };

  const complete = async (id: string) => {
    await officeApi.completeTask(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Bug fixes, features, refactoring, docs, and architecture tasks</p>
        <Button onClick={generate} disabled={loading}>Generate tasks</Button>
      </div>

      <div className="grid gap-4">
        {tasks.map((t) => (
          <Card key={t.id} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{t.title}</CardTitle>
              <Badge variant={t.status === "completed" ? "default" : "secondary"}>{t.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{t.type.replace(/_/g, " ")}</Badge>
                {t.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => complete(t.id)}>Complete</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
