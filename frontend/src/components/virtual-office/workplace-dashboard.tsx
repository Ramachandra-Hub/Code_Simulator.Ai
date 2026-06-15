"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, MessageSquare, Mic, RefreshCw, TrendingUp } from "lucide-react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Task = { id: string; title: string; type: string; description: string; status: string };
type Standup = {
  yesterday: string;
  today: string;
  blockers?: string;
  feedback?: string;
  createdAt: string;
};
type Meeting = { id: string; type: string; title: string; status: string; voiceEnabled: boolean };
type Review = {
  period: string;
  technical: number;
  communication: number;
  ownership: number;
  promotionReady: number;
  summary?: string;
  createdAt: string;
};
type Assessment = { ready: boolean; score: number; recommendation?: string; createdAt: string };

const MEETING_TYPES = [
  { type: "sprint_planning", label: "Sprint Planning" },
  { type: "retrospective", label: "Retrospective" },
  { type: "client", label: "Client Meeting" },
];

export function WorkplaceDashboard() {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [standups, setStandups] = useState<Standup[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [promotions, setPromotions] = useState<Assessment[]>([]);
  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingStandup, setSubmittingStandup] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, work, st, mt, perf, promo] = await Promise.all([
        officeApi.overview(),
        officeApi.work(),
        officeApi.standups(),
        officeApi.meetings(),
        officeApi.performance(),
        officeApi.promotion(),
      ]);
      setOverview(ov);
      setTasks((work.pending as Task[]) || []);
      setStandups((st.standups as Standup[]) || []);
      setMeetings((mt.meetings as Meeting[]) || []);
      setReviews((perf.reviews as Review[]) || []);
      setPromotions((promo.assessments as Assessment[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const session = overview?.session as { company?: { name?: string; culture?: string }; role?: string; level?: string } | undefined;
  const managerMessages = (overview?.managerMessages as Array<{ text?: string; from?: string }>) || [];
  const sprint = overview?.sprint as { name?: string; progress?: number; daysLeft?: number } | undefined;
  const analytics = overview?.analytics as { taskCompletion?: { rate?: number } } | undefined;

  const completeTask = async (id: string) => {
    await officeApi.completeTask(id);
    void load();
  };

  const submitStandup = async () => {
    setSubmittingStandup(true);
    try {
      await officeApi.submitStandup({ yesterday, today, blockers: blockers || undefined });
      setYesterday("");
      setToday("");
      setBlockers("");
      void load();
    } finally {
      setSubmittingStandup(false);
    }
  };

  const scheduleMeeting = async (type: string) => {
    await officeApi.scheduleMeeting(type);
    void load();
  };

  const runReview = async () => {
    await officeApi.runPerformanceReview("weekly");
    void load();
  };

  const runPromotion = async () => {
    await officeApi.runPromotionAssessment();
    void load();
  };

  const latestReview = reviews[0];
  const latestPromotion = promotions[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Virtual company — tasks, standups, meetings, and reviews in one place</p>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-card border-blue-500/20">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Building2 className="h-10 w-10 text-blue-500" />
          <div>
            <p className="text-lg font-semibold">{loading ? "…" : session?.company?.name || "Virtual Company"}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {session?.company?.culture} · {session?.role?.replace(/_/g, " ")} · {session?.level}
            </p>
          </div>
          {sprint && (
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">{sprint.name || "Current sprint"}</p>
              <p className="text-sm font-semibold">{sprint.progress ?? 0}% · {sprint.daysLeft ?? "—"} days left</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 && !loading && (
              <Button size="sm" onClick={() => officeApi.generateTasks().then(() => load())}>
                Generate tasks
              </Button>
            )}
            {tasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void completeTask(t.id)}>
                  Done
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Manager Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {managerMessages.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">No new messages — complete tasks to trigger feedback.</p>
            )}
            {managerMessages.slice(0, 4).map((m, i) => (
              <div key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">{m.from || "Manager"}</p>
                <p>{m.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Standup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Yesterday</Label>
              <Textarea value={yesterday} onChange={(e) => setYesterday(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Today</Label>
              <Textarea value={today} onChange={(e) => setToday(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Blockers</Label>
              <Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} rows={1} className="mt-1" />
            </div>
            <Button onClick={() => void submitStandup()} disabled={submittingStandup || !yesterday || !today}>
              Submit standup
            </Button>
            {standups[0] && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                Last: {standups[0].feedback || "Submitted"} · {new Date(standups[0].createdAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4" /> Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {MEETING_TYPES.map((m) => (
                <Button key={m.type} size="sm" variant="outline" onClick={() => void scheduleMeeting(m.type)}>
                  {m.label}
                </Button>
              ))}
            </div>
            {meetings.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm rounded-lg border px-3 py-2">
                <span>{m.title}</span>
                <Badge variant="secondary" className="capitalize">
                  {m.status}
                </Badge>
              </div>
            ))}
            {meetings.some((m) => m.voiceEnabled && m.status === "scheduled") && (
              <Button asChild size="sm" variant="gradient">
                <Link href="/office/meetings">Join voice meeting</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Performance Review</CardTitle>
            <Button size="sm" variant="outline" onClick={() => void runReview()} disabled={loading}>
              Run review
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestReview ? (
              <>
                <p className="text-xs text-muted-foreground capitalize">
                  {latestReview.period} · {new Date(latestReview.createdAt).toLocaleDateString()}
                </p>
                {[
                  { label: "Technical", value: latestReview.technical },
                  { label: "Communication", value: latestReview.communication },
                  { label: "Ownership", value: latestReview.ownership },
                  { label: "Promotion ready", value: latestReview.promotionReady },
                ].map((d) => (
                  <div key={d.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{d.label}</span>
                      <span>{d.value}</span>
                    </div>
                    <Progress value={d.value} />
                  </div>
                ))}
                {latestReview.summary && <p className="text-sm text-muted-foreground">{latestReview.summary}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Complete tasks and standups to unlock your first review.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Promotion Readiness
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => void runPromotion()} disabled={loading}>
              Assess
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPromotion ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{latestPromotion.score}%</p>
                  <Badge variant={latestPromotion.ready ? "success" : "secondary"}>
                    {latestPromotion.ready ? "Ready" : "In progress"}
                  </Badge>
                </div>
                {latestPromotion.recommendation && (
                  <p className="text-sm text-muted-foreground">{latestPromotion.recommendation}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Run an assessment after completing sprint work.</p>
            )}
            {analytics?.taskCompletion?.rate != null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Sprint task completion: {analytics.taskCompletion.rate}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
