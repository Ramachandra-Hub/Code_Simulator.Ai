"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type Meeting = {
  id: string;
  type: string;
  title: string;
  status: string;
  voiceEnabled: boolean;
  scheduledAt: string;
  agenda?: { topics?: string[] };
};

const MEETING_TYPES = [
  { type: "sprint_planning", label: "Sprint Planning" },
  { type: "retrospective", label: "Retrospective" },
  { type: "client", label: "Client Meeting" },
  { type: "design_review", label: "Design Review" },
];

export default function OfficeMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () => officeApi.meetings().then((d) => setMeetings((d.meetings as Meeting[]) || []));

  useEffect(() => { load(); }, []);

  const schedule = async (type: string) => {
    await officeApi.scheduleMeeting(type);
    load();
  };

  const complete = async (id: string) => {
    await officeApi.completeMeeting(id, { notes: notes[id] || "Participated in meeting discussion." });
    load();
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        AI-led meetings with voice support —{" "}
        <Link href="/interview" className="text-primary underline">reuse PR-7 voice infra</Link>
      </p>

      <div className="flex flex-wrap gap-2">
        {MEETING_TYPES.map((m) => (
          <Button key={m.type} variant="outline" size="sm" onClick={() => schedule(m.type)}>
            Schedule {m.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {meetings.map((m) => (
          <Card key={m.id} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{m.title}</CardTitle>
                <p className="text-xs text-muted-foreground capitalize">{m.type.replace(/_/g, " ")} · {new Date(m.scheduledAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {m.voiceEnabled && <Mic className="h-4 w-4 text-blue-500" />}
                <Badge>{m.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {m.agenda?.topics && (
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {m.agenda.topics.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {m.status !== "completed" && (
                <>
                  <Textarea
                    placeholder="Meeting notes or voice transcript summary…"
                    value={notes[m.id] || ""}
                    onChange={(e) => setNotes({ ...notes, [m.id]: e.target.value })}
                    rows={2}
                  />
                  <Button size="sm" onClick={() => complete(m.id)}>Mark attended</Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
