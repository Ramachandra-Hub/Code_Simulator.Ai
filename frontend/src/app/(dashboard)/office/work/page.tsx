"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Task = { id: string; title: string; type: string; description: string; status: string };

export default function OfficeWorkPage() {
  const [pending, setPending] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    officeApi.work().then((d) => {
      setPending((d.pending as Task[]) || []);
      setCompleted((d.completed as Task[]) || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const complete = async (id: string) => {
    await officeApi.completeTask(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Priority tasks for your virtual sprint</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">In Progress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && !loading && <p className="text-sm text-muted-foreground">All caught up!</p>}
          {pending.map((t) => (
            <div key={t.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                <Badge variant="secondary" className="mt-2 capitalize">{t.type.replace(/_/g, " ")}</Badge>
              </div>
              <Button size="sm" onClick={() => complete(t.id)}>Mark done</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Completed</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {completed.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t.title}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
