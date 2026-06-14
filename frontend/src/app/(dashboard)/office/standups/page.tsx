"use client";

import { useEffect, useState } from "react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Standup = {
  yesterday: string;
  today: string;
  blockers?: string;
  communicationScore: number;
  ownershipScore: number;
  professionalismScore: number;
  feedback?: string;
  createdAt: string;
};

export default function OfficeStandupsPage() {
  const [standups, setStandups] = useState<Standup[]>([]);
  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => officeApi.standups().then((d) => setStandups((d.standups as Standup[]) || []));

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      await officeApi.submitStandup({ yesterday, today, blockers: blockers || undefined });
      setYesterday("");
      setToday("");
      setBlockers("");
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Daily standup — evaluated on communication, ownership, and professionalism</p>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Submit Standup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>What did you do yesterday?</Label>
            <Textarea value={yesterday} onChange={(e) => setYesterday(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div>
            <Label>What are you doing today?</Label>
            <Textarea value={today} onChange={(e) => setToday(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div>
            <Label>Any blockers?</Label>
            <Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} className="mt-1" rows={2} />
          </div>
          <Button onClick={submit} disabled={submitting || !yesterday || !today}>Submit standup</Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {standups.map((s, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
              <p className="mt-2"><strong>Yesterday:</strong> {s.yesterday}</p>
              <p><strong>Today:</strong> {s.today}</p>
              {s.blockers && <p><strong>Blockers:</strong> {s.blockers}</p>}
              <p className="mt-2 text-xs">
                Comm {s.communicationScore} · Ownership {s.ownershipScore} · Pro {s.professionalismScore}
              </p>
              {s.feedback && <p className="mt-1 text-muted-foreground">{s.feedback}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
