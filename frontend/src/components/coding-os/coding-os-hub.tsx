"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Code2, Loader2, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { codingOsApi } from "@/lib/coding-os-client";

const TABS = [
  { id: "practice", label: "Practice" },
  { id: "dsa", label: "DSA" },
  { id: "sql", label: "SQL" },
  { id: "mcq", label: "MCQ" },
  { id: "assignments", label: "Assignments" },
  { id: "contests", label: "Contests" },
  { id: "projects", label: "Projects" },
  { id: "mentor", label: "AI Mentor" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Analytics" },
] as const;

type ProblemRow = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  topic?: { name: string };
  company?: { name: string };
};

function CodingOSHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "practice";
  const active = TABS.some((t) => t.id === tab) ? tab : "practice";

  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [dsa, setDsa] = useState<Record<string, unknown> | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Record<string, unknown> | null>(null);
  const [contests, setContests] = useState<unknown[]>([]);
  const [assignments, setAssignments] = useState<unknown[]>([]);
  const [mcq, setMcq] = useState<unknown[]>([]);
  const [sql, setSql] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mentorMsg, setMentorMsg] = useState("");
  const [mentorReply, setMentorReply] = useState("");

  const setTab = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`/coding-os?${params.toString()}`);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([
        codingOsApi.problems(),
        codingOsApi.overview(),
      ]);
      setProblems((p.problems as ProblemRow[]) || []);
      setDsa(o.dsa as Record<string, unknown>);
      setAnalytics(o.analytics as Record<string, unknown>);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (tab === "history") codingOsApi.history().then(setHistory).catch(() => setHistory(null));
    if (tab === "contests") codingOsApi.contests().then((d) => setContests(d.contests)).catch(() => setContests([]));
    if (tab === "assignments") codingOsApi.assignments().then((d) => setAssignments(d.assignments)).catch(() => setAssignments([]));
    if (tab === "mcq") codingOsApi.mcq().then((d) => setMcq(d.questions)).catch(() => setMcq([]));
    if (tab === "sql") codingOsApi.sql().then((d) => setSql(d.datasets)).catch(() => setSql([]));
    if (tab === "analytics") codingOsApi.analytics().then((d) => setAnalytics(d.analytics as Record<string, unknown>)).catch(() => {});
  }, [tab]);

  const generateProblem = async () => {
    setGenerating(true);
    try {
      const res = await codingOsApi.generateProblem({ targetCompany: "Amazon" });
      const problem = res.problem as { id?: string };
      if (problem?.id) router.push(`/coding-os/problem/${problem.id}`);
      else void load();
    } finally {
      setGenerating(false);
    }
  };

  const askMentor = async () => {
    if (!mentorMsg.trim()) return;
    const res = await codingOsApi.mentor({ message: mentorMsg });
    setMentorReply(String(res.reply || ""));
  };

  const diffVariant = (d: string) => (d === "easy" ? "success" : d === "hard" ? "destructive" : "warning");

  return (
    <Tabs value={active} onValueChange={setTab} className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
        {TABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="text-xs sm:text-sm">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="practice" className="mt-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gradient" onClick={() => void generateProblem()} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate AI Problem
          </Button>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading problems from database…</p>
        ) : (
          <div className="space-y-2">
            {problems.map((p) => (
              <Card key={p.id} className="glass-card hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center justify-between p-4 gap-3 flex-wrap">
                  <div>
                    <Link href={`/coding-os/problem/${p.id}`} className="font-medium hover:text-primary">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.topic?.name || p.category}
                      {p.company?.name ? ` · ${p.company.name}` : ""}
                    </p>
                  </div>
                  <Badge variant={diffVariant(p.difficulty)}>{p.difficulty}</Badge>
                </CardContent>
              </Card>
            ))}
            {problems.length === 0 && (
              <p className="text-sm text-muted-foreground">No problems yet. Run db seed or generate one.</p>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="dsa" className="mt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {((dsa?.topics as Array<{ name: string; completionPct: number; weakArea: boolean }>) || []).map((t) => (
            <Card key={t.name} className="glass-card">
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <p className="font-medium">{t.name}</p>
                  {t.weakArea && <Badge variant="destructive">Weak</Badge>}
                </div>
                <Progress value={t.completionPct} />
                <p className="text-xs text-muted-foreground mt-1">{t.completionPct}% complete</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {dsa?.recommendedNext != null ? (
          <p className="text-sm text-muted-foreground mt-4">
            Recommended next: <strong>{(dsa.recommendedNext as { name: string }).name}</strong>
          </p>
        ) : null}
      </TabsContent>

      <TabsContent value="sql" className="mt-0 space-y-3">
        {(sql as Array<{ name: string; description?: string; challenges: unknown[] }>).map((d) => (
          <Card key={d.name} className="glass-card">
            <CardContent className="p-4">
              <p className="font-medium">{d.name}</p>
              <p className="text-sm text-muted-foreground">{d.description}</p>
              <p className="text-xs mt-2">{d.challenges?.length || 0} challenges</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="mcq" className="mt-0 space-y-3">
        {(mcq as Array<{ id: string; question: string; difficulty: string }>).map((q) => (
          <Card key={q.id} className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm">{q.question}</p>
              <Badge className="mt-2" variant="outline">
                {q.difficulty}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="assignments" className="mt-0 space-y-3">
        {(assignments as Array<{ id: string; title: string; deadline?: string }>).map((a) => (
          <Card key={a.id} className="glass-card">
            <CardContent className="p-4">
              <p className="font-medium">{a.title}</p>
              {a.deadline && <p className="text-xs text-muted-foreground">Due {new Date(a.deadline).toLocaleDateString()}</p>}
            </CardContent>
          </Card>
        ))}
        {assignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments published yet.</p>}
      </TabsContent>

      <TabsContent value="contests" className="mt-0 space-y-3">
        {(contests as Array<{ id: string; title: string; status: string }>).map((c) => (
          <Card key={c.id} className="glass-card">
            <CardContent className="p-4 flex justify-between">
              <p className="font-medium">{c.title}</p>
              <Badge variant="outline">{c.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {contests.length === 0 && <p className="text-sm text-muted-foreground">No active contests.</p>}
      </TabsContent>

      <TabsContent value="projects" className="mt-0">
        <p className="text-sm text-muted-foreground">
          Project-based coding tracks link to your GitHub integration and Workplace AI deliverables.
        </p>
      </TabsContent>

      <TabsContent value="mentor" className="mt-0 space-y-3">
        <textarea
          className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
          placeholder="Ask about approach, complexity, or a practice plan…"
          value={mentorMsg}
          onChange={(e) => setMentorMsg(e.target.value)}
        />
        <Button onClick={() => void askMentor()}>Ask Coding Mentor</Button>
        {mentorReply && <Card className="glass-card"><CardContent className="p-4 text-sm whitespace-pre-wrap">{mentorReply}</CardContent></Card>}
      </TabsContent>

      <TabsContent value="history" className="mt-0 space-y-3">
        {((history?.submissions as Array<{ id: string; verdict: string; problem?: { title: string } }>) || []).map((s) => (
          <Card key={s.id} className="glass-card">
            <CardContent className="p-4 flex justify-between">
              <span className="text-sm">{s.problem?.title || "Submission"}</span>
              <Badge variant={s.verdict === "accepted" ? "success" : "secondary"}>{s.verdict}</Badge>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="analytics" className="mt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Solved", value: analytics?.problemsSolved },
            { label: "Attempts", value: analytics?.totalAttempts },
            { label: "Acceptance", value: analytics?.acceptanceRate != null ? `${Math.round(Number(analytics.acceptanceRate))}%` : "—" },
            { label: "Readiness", value: analytics?.codingReadiness },
          ].map((s) => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{String(s.value ?? "—")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function CodingOSHub() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Coding OS…</p>}>
      <CodingOSHubInner />
    </Suspense>
  );
}

export function CodingOSShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <div className="border-b border-border/60 bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-indigo-600/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <Code2 className="h-8 w-8 text-cyan-500" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Coding OS</p>
            <h1 className="text-2xl font-bold">Coding Operating System</h1>
            <p className="mt-1 text-sm text-muted-foreground">Practice, judge, contests, and AI mentor — all database-backed</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
