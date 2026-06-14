"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Bot, User, Send, Play, Loader2, Code2, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
];

interface CodingSessionData {
  id: string;
  status: string;
  problem: { title: string; description: string; difficulty: string; examples?: Array<{ input: string; output: string }> };
  starterCode: string;
  language: string;
  interviewSessionId?: string | null;
  evaluation?: {
    overallScore: number;
    verdict: string;
    timeComplexity: string;
    spaceComplexity: string;
    correctnessScore: number;
    source: string;
  } | null;
  progress: { discussionIndex: number; totalDiscussionQuestions: number };
  turns: Array<{ role: string; type: string; content: string }>;
}

type Phase = "coding" | "submitted" | "discussion" | "complete";

export function CodingInterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const sessionId = searchParams.get("sessionId");
  const interviewId = searchParams.get("interviewId");
  const resumeId = searchParams.get("resume");

  const [session, setSession] = useState<CodingSessionData | null>(null);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [phase, setPhase] = useState<Phase>("coding");
  const [discussionAnswer, setDiscussionAnswer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  const refreshSession = useCallback(async (id: string) => {
    const data = await apiFetch<CodingSessionData>(`/coding/sessions/${id}`);
    setSession(data);
    setLanguage(data.language);
    if (data.status === "discussion") setPhase("discussion");
    if (data.status === "completed") setPhase("complete");
    if (data.status === "submitted") setPhase("submitted");
    const lastQ = [...data.turns].reverse().find((t) => t.type === "discussion_question");
    if (lastQ) setCurrentQuestion(lastQ.content);
    return data;
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        if (sessionId) {
          const data = await refreshSession(sessionId);
          setCode(data.starterCode);
          setLoading(false);
          return;
        }

        const created = await apiFetch<{ id: string; starterCode: string; language: string }>("/coding/sessions", {
          method: "POST",
          body: JSON.stringify({
            interviewSessionId: interviewId || undefined,
            resumeId: resumeId || undefined,
          }),
        });
        router.replace(`${ROUTES.interviewCoding}?sessionId=${created.id}${interviewId ? `&interviewId=${interviewId}` : ""}`);
        setCode(created.starterCode);
        setLanguage(created.language);
        await refreshSession(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start coding session");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [sessionId, interviewId, resumeId, refreshSession, router]);

  const runCode = async () => {
    if (!session) return;
    setBusy(true);
    setOutput("Running...");
    try {
      const result = await apiFetch<{ stdout: string | null; stderr: string | null; verdict: string }>(
        `/coding/sessions/${session.id}/run`,
        { method: "POST", body: JSON.stringify({ code, language }) }
      );
      setOutput(result.stdout || result.stderr || result.verdict);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Run failed");
    }
    setBusy(false);
  };

  const submitCode = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const result = await apiFetch<{
        evaluation: CodingSessionData["evaluation"];
        discussionQuestions: string[];
        openingPrompt: string;
        phase: string;
      }>(`/coding/sessions/${session.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
      });
      setPhase("discussion");
      setCurrentQuestion(result.discussionQuestions[0] || "Explain your approach.");
      setOutput(`Verdict: ${result.evaluation?.verdict}\nScore: ${result.evaluation?.overallScore}/100`);
      await refreshSession(session.id);
      toast({ title: "Code submitted", description: `Score: ${result.evaluation?.overallScore}/100 (${result.evaluation?.source})` });
    } catch (err) {
      toast({ title: "Submit failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    }
    setBusy(false);
  };

  const submitDiscussion = async () => {
    if (!session || discussionAnswer.trim().length < 5) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ nextQuestion: string | null; phase: string; progress: { discussionIndex: number; total: number } }>(
        `/coding/sessions/${session.id}/discuss`,
        { method: "POST", body: JSON.stringify({ answer: discussionAnswer }) }
      );
      setDiscussionAnswer("");
      if (result.phase === "complete") {
        setPhase("complete");
        await refreshSession(session.id);
      } else if (result.nextQuestion) {
        setCurrentQuestion(result.nextQuestion);
      }
    } catch (err) {
      toast({ title: "Discussion failed", description: err instanceof Error ? err.message : "Error", variant: "error" });
    }
    setBusy(false);
  };

  const continueInterview = () => {
    if (session?.interviewSessionId) {
      router.push(`${ROUTES.interviewSession}?resume=${resumeId || ""}&type=technical&interviewId=${session.interviewSessionId}`);
    } else {
      router.push(ROUTES.interviewHistory);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading coding interview...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">{error || "Session not found"}</p>
        <Button variant="outline" onClick={() => router.push(ROUTES.interviewStart)}>Back</Button>
      </div>
    );
  }

  const discussionPct = session.progress.totalDiscussionQuestions
    ? (session.progress.discussionIndex / session.progress.totalDiscussionQuestions) * 100
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-5 max-w-6xl mx-auto">
      <div className="lg:col-span-3 space-y-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                {session.problem.title}
              </CardTitle>
              <Badge variant="info">{session.problem.difficulty}</Badge>
            </div>
            {phase === "discussion" && (
              <Progress value={discussionPct} className="mt-2" />
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm whitespace-pre-wrap">
              {session.problem.description}
              {session.problem.examples?.map((ex, i) => (
                <div key={i} className="mt-2 text-xs text-muted-foreground">
                  Input: {ex.input} → Output: {ex.output}
                </div>
              ))}
            </div>

            {phase === "coding" && (
              <>
                <div className="flex justify-end">
                  <select
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl overflow-hidden border border-border">
                  <MonacoEditor
                    height="320px"
                    language={language}
                    value={code}
                    onChange={(v) => setCode(v || "")}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 14 }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={runCode} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run
                  </Button>
                  <Button onClick={submitCode} disabled={busy} variant="gradient" className="flex-1">
                    <Send className="mr-2 h-4 w-4" /> Submit Solution
                  </Button>
                </div>
              </>
            )}

            {phase === "discussion" && session.evaluation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-lg font-bold text-primary">{session.evaluation.overallScore}</p>
                    <p className="text-xs text-muted-foreground">Overall</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-sm font-bold">{session.evaluation.verdict}</p>
                    <p className="text-xs text-muted-foreground">Verdict</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs font-bold">{session.evaluation.timeComplexity}</p>
                    <p className="text-xs text-muted-foreground">Time</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs font-bold">{session.evaluation.spaceComplexity}</p>
                    <p className="text-xs text-muted-foreground">Space</p>
                  </div>
                </div>
                <Badge variant="secondary">Scores: heuristic source of truth</Badge>

                <div className="rounded-xl bg-violet-500/10 border border-violet-500/30 p-4">
                  <p className="text-sm font-medium">{currentQuestion}</p>
                </div>
                <Textarea
                  value={discussionAnswer}
                  onChange={(e) => setDiscussionAnswer(e.target.value)}
                  placeholder="Answer the discussion question..."
                  className="min-h-[100px]"
                  disabled={busy}
                />
                <Button onClick={submitDiscussion} disabled={busy || discussionAnswer.trim().length < 5} className="w-full" variant="gradient">
                  Submit Answer
                </Button>
              </div>
            )}

            {phase === "complete" && (
              <div className="space-y-4 text-center py-4">
                <p className="text-lg font-semibold">Coding round complete</p>
                <p className="text-2xl font-bold text-primary">{session.evaluation?.overallScore ?? "—"}/100</p>
                <p className="text-sm text-muted-foreground">Digital Twin updated · Placement readiness recalculated</p>
                <Button onClick={continueInterview} className="w-full" variant="gradient">
                  {session.interviewSessionId ? "Continue Interview" : "Back to Interviews"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {output && phase === "coding" && (
              <pre className="rounded-xl bg-muted/50 p-4 text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{output}</pre>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="glass-card h-full max-h-[640px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Session Log</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {session.turns.map((t, i) => (
              <div key={i} className={cn("flex gap-2 text-sm", t.role === "ai" ? "flex-row" : "flex-row-reverse")}>
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", t.role === "ai" ? "bg-primary/20" : "bg-violet-500/20")}>
                  {t.role === "ai" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div className={cn("rounded-xl px-3 py-2 max-w-[90%] text-xs", t.role === "ai" ? "bg-muted/60" : "bg-violet-500/10")}>
                  <p className="opacity-60 mb-0.5">{t.type}</p>
                  <p className="whitespace-pre-wrap">{t.content.slice(0, 500)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
