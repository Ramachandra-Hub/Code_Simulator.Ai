"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Send, ChevronRight, Loader2, AlertTriangle, Sparkles, Code2, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SpeechInput } from "@/components/interview/speech-input";
import { TranscriptPanel, type TranscriptEntry } from "@/components/interview/transcript-panel";
import { useToast } from "@/hooks/use-toast";
import { friendlyApiError } from "@/lib/error-messages";
import { apiFetch } from "@/lib/api-client";
import { isTtsSupported, speakText, stopSpeaking } from "@/lib/interview-speech";
import { INTERVIEW_TYPES, type InterviewType } from "@/lib/interview-types";
import { ROUTES } from "@/lib/routes";

interface CreateResponse {
  id: string;
  type: string;
  targetRole: string | null;
  firstQuestion: string;
  codingSessionId?: string;
  progress: { questionIndex: number; maxQuestions: number; followUpCount: number; difficulty: string };
}

interface AnswerResponse {
  evaluation: {
    answerType: string;
    confidence: number;
    scores: { relevance: number; depth: number; communication: number; confidence: number; overall: number };
    feedback: string;
    keywordsMatched: string[];
    signals: string[];
  };
  nextQuestion: string | null;
  phase: "follow_up" | "next_question" | "complete";
  progress: { questionIndex: number; maxQuestions: number; followUpCount: number; difficulty: string };
  codingRoundAvailable?: boolean;
}

const ANSWER_TYPE_BADGES: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "info" | "secondary" }> = {
  strong: { label: "Strong Answer", variant: "success" },
  weak: { label: "Weak Answer", variant: "destructive" },
  partial: { label: "Partial Answer", variant: "warning" },
  irrelevant: { label: "Off-Topic", variant: "destructive" },
  team_ownership: { label: "Team Project — needs ownership", variant: "warning" },
  lack_of_knowledge: { label: "Knowledge Gap", variant: "warning" },
  confidence_issue: { label: "Confidence Issue", variant: "info" },
  communication_issue: { label: "Communication Needs Work", variant: "info" },
};

function entryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function InterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const type = (searchParams.get("type") || "technical") as InterviewType;
  const resumeId = searchParams.get("resume");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [pendingNextQuestion, setPendingNextQuestion] = useState<string | null>(null);
  const [progress, setProgress] = useState({ questionIndex: 0, maxQuestions: 6, followUpCount: 0, difficulty: "medium" });
  const [phase, setPhase] = useState<"answering" | "feedback" | "completing" | "error">("answering");
  const [error, setError] = useState<string | null>(null);

  const [answer, setAnswer] = useState("");
  const [liveSpeech, setLiveSpeech] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(true);
  const [lastEval, setLastEval] = useState<AnswerResponse["evaluation"] | null>(null);
  const [codingRoundAvailable, setCodingRoundAvailable] = useState(false);
  const [startingCodingRound, setStartingCodingRound] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const initRef = useRef(false);
  const lastSpokenQuestion = useRef<string>("");

  const typeInfo = INTERVIEW_TYPES.find((t) => t.id === type);

  useEffect(() => {
    if (type !== "coding") {
      const voice = searchParams.get("voice") || "professional";
      const q = new URLSearchParams({ type, voice });
      if (resumeId) q.set("resume", resumeId);
      router.replace(`${ROUTES.interviewVoice}?${q.toString()}`);
    }
  }, [type, resumeId, router, searchParams]);

  const speakQuestion = useCallback(
    (text: string) => {
      if (!voiceEnabled || !text || text === lastSpokenQuestion.current) return;
      lastSpokenQuestion.current = text;
      speakText(text);
    },
    [voiceEnabled]
  );

  useEffect(() => {
    if (type !== "coding") return;
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const created = await apiFetch<CreateResponse>("/interviews", {
          method: "POST",
          body: JSON.stringify({ type, resumeId }),
        });

        if (type === "coding" && created.codingSessionId) {
          router.push(`${ROUTES.interviewCoding}?sessionId=${created.codingSessionId}&interviewId=${created.id}${resumeId ? `&resume=${resumeId}` : ""}`);
          return;
        }

        setSessionId(created.id);
        setCurrentQuestion(created.firstQuestion);
        setProgress(created.progress);
        setTranscript([
          {
            id: entryId(),
            role: "ai",
            kind: "welcome",
            text: `Welcome to your ${typeInfo?.label || type} interview${created.targetRole ? ` for ${created.targetRole}` : ""}. Let's begin.`,
            timestamp: new Date().toISOString(),
          },
          {
            id: entryId(),
            role: "ai",
            kind: "question",
            text: created.firstQuestion,
            timestamp: new Date().toISOString(),
          },
        ]);
        speakQuestion(created.firstQuestion);
      } catch (err) {
        const msg = friendlyApiError(err instanceof Error ? err.message : "Could not start interview");
        setError(msg);
        setPhase("error");
        toast({ title: "Failed to start interview", description: msg, variant: "error" });
      } finally {
        setCreating(false);
      }
    };
    init();
  }, [type, resumeId, router, speakQuestion, toast, typeInfo?.label]);

  useEffect(() => () => stopSpeaking(), []);

  const handleSpeech = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setAnswer((prev) => (prev ? `${prev} ${text}` : text));
      setLiveSpeech("");
    } else {
      setLiveSpeech(text);
    }
  }, []);

  const submitAnswer = async () => {
    if (!sessionId) return;
    const fullAnswer = (answer + (liveSpeech ? ` ${liveSpeech}` : "")).trim();
    if (fullAnswer.length < 10) {
      toast({ title: "Answer too short", description: "Please provide a more detailed response.", variant: "error" });
      return;
    }

    const answerEntryId = entryId();
    setSubmitting(true);
    setTranscript((prev) => [
      ...prev,
      { id: answerEntryId, role: "student", kind: "answer", text: fullAnswer, timestamp: new Date().toISOString() },
    ]);

    try {
      const result = await apiFetch<AnswerResponse>(`/interviews/${sessionId}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer: fullAnswer }),
      });

      setLastEval(result.evaluation);
      setProgress(result.progress);
      setCodingRoundAvailable(!!result.codingRoundAvailable);
      setPhase("feedback");
      setAnswer("");
      setLiveSpeech("");
      setPendingNextQuestion(result.nextQuestion);

      const summary = `Score ${result.evaluation.scores.overall}/100. ${result.evaluation.feedback}`;
      setTranscript((prev) => [
        ...prev,
        { id: entryId(), role: "ai", kind: "feedback", text: summary, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      setTranscript((prev) => prev.filter((e) => e.id !== answerEntryId));
      const msg = friendlyApiError(err instanceof Error ? err.message : "Submit failed");
      toast({ title: "Submission failed", description: msg, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const advance = async () => {
    if (!sessionId || !lastEval) return;

    if (progress.questionIndex >= progress.maxQuestions) {
      setPhase("completing");
      try {
        await apiFetch(`/interviews/${sessionId}/complete`, { method: "POST" });
        router.push(`${ROUTES.interviewReport}?id=${sessionId}`);
      } catch (err) {
        const msg = friendlyApiError(err instanceof Error ? err.message : "Could not complete");
        toast({ title: "Failed to complete", description: msg, variant: "error" });
        setPhase("feedback");
      }
      return;
    }

    if (pendingNextQuestion) {
      setCurrentQuestion(pendingNextQuestion);
      setTranscript((prev) => [
        ...prev,
        {
          id: entryId(),
          role: "ai",
          kind: "question",
          text: pendingNextQuestion,
          timestamp: new Date().toISOString(),
        },
      ]);
      speakQuestion(pendingNextQuestion);
      setPendingNextQuestion(null);
    }

    setLastEval(null);
    setPhase("answering");
  };

  const startCodingRound = async () => {
    if (!sessionId) return;
    setStartingCodingRound(true);
    try {
      const result = await apiFetch<{ codingSessionId: string }>(`/interviews/${sessionId}/coding-round`, { method: "POST" });
      router.push(`${ROUTES.interviewCoding}?sessionId=${result.codingSessionId}&interviewId=${sessionId}${resumeId ? `&resume=${resumeId}` : ""}`);
    } catch (err) {
      toast({ title: "Coding round failed", description: friendlyApiError(err instanceof Error ? err.message : "Error"), variant: "error" });
      setStartingCodingRound(false);
    }
  };

  const finishEarly = async () => {
    if (!sessionId) return;
    setPhase("completing");
    try {
      await apiFetch(`/interviews/${sessionId}/complete`, { method: "POST" });
      router.push(`${ROUTES.interviewReport}?id=${sessionId}`);
    } catch (err) {
      const msg = friendlyApiError(err instanceof Error ? err.message : "Could not complete");
      toast({ title: "Failed to complete", description: msg, variant: "error" });
      setPhase("answering");
    }
  };

  const displayAnswer = useMemo(() => {
    if (!liveSpeech) return answer;
    return answer ? `${answer} ${liveSpeech}` : liveSpeech;
  }, [answer, liveSpeech]);

  if (creating || (!sessionId && !error)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Starting your AI interview...</p>
        <p className="text-xs text-muted-foreground">First question may take 15–30s while the AI loads</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h3 className="font-semibold">Could not start interview</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => router.push(ROUTES.interviewStart)}>Back</Button>
          <Button onClick={() => router.push(ROUTES.resumeBuilder)}>Build Resume</Button>
        </div>
      </div>
    );
  }

  const progressPct = (progress.questionIndex / progress.maxQuestions) * 100;

  return (
    <div className="grid gap-6 lg:grid-cols-5 max-w-6xl mx-auto">
      <div className="lg:col-span-3 space-y-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                {typeInfo?.label || type} — Question {Math.min(progress.questionIndex + 1, progress.maxQuestions)} of {progress.maxQuestions}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isTtsSupported() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (voiceEnabled) stopSpeaking();
                      setVoiceEnabled((v) => !v);
                    }}
                    title={voiceEnabled ? "Mute AI voice" : "Enable AI voice"}
                  >
                    {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                )}
                <Badge variant="info">{progress.difficulty}</Badge>
                {progress.followUpCount > 0 && <Badge variant="warning">Follow-up {progress.followUpCount}</Badge>}
              </div>
            </div>
            <Progress value={progressPct} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium leading-relaxed">{currentQuestion}</p>
              </div>
            </div>

            {phase === "answering" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Answer</label>
                  <Textarea
                    value={displayAnswer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setLiveSpeech("");
                    }}
                    placeholder="Type or click Start Speaking..."
                    className="min-h-[120px]"
                    disabled={submitting}
                  />
                </div>
                <SpeechInput
                  onTranscript={handleSpeech}
                  onError={(msg) => toast({ title: "Voice input", description: msg, variant: "error" })}
                  disabled={submitting}
                />
                <div className="flex gap-2">
                  <Button onClick={submitAnswer} disabled={submitting || displayAnswer.trim().length < 10} className="flex-1" variant="gradient">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {submitting ? "Analyzing answer..." : progress.followUpCount > 0 ? "Submit Follow-Up" : "Submit Answer"}
                  </Button>
                  <Button variant="outline" onClick={finishEarly} disabled={submitting}>End</Button>
                </div>
                {submitting && (
                  <p className="text-xs text-muted-foreground text-center">AI analysis in progress — this may take 15–30 seconds</p>
                )}
              </>
            )}

            {phase === "feedback" && lastEval && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge variant={ANSWER_TYPE_BADGES[lastEval.answerType]?.variant || "secondary"}>
                    {ANSWER_TYPE_BADGES[lastEval.answerType]?.label || lastEval.answerType}
                  </Badge>
                  <p className="text-sm text-muted-foreground">Confidence: {Math.round(lastEval.confidence * 100)}%</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["relevance", "depth", "communication", "confidence"] as const).map((k) => (
                    <div key={k} className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-lg font-bold text-primary">{lastEval.scores[k]}</p>
                      <p className="text-xs text-muted-foreground capitalize">{k}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Overall: {lastEval.scores.overall}/100</p>
                  <p className="text-sm text-muted-foreground mt-1">{lastEval.feedback}</p>
                  {lastEval.keywordsMatched.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lastEval.keywordsMatched.map((k) => (
                        <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {lastEval.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lastEval.signals.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />{s.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                )}

                {pendingNextQuestion && (
                  <div className="rounded-xl bg-muted/40 border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Next question preview</p>
                    <p className="text-sm">{pendingNextQuestion}</p>
                  </div>
                )}

                {codingRoundAvailable && type === "technical" && (
                  <Button onClick={startCodingRound} variant="outline" className="w-full" disabled={startingCodingRound}>
                    {startingCodingRound ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />}
                    Start Coding Round
                  </Button>
                )}

                <Button onClick={advance} className="w-full" variant="gradient">
                  {progress.questionIndex >= progress.maxQuestions ? "View Placement Report" : "Continue to Next Question"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {phase === "completing" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating your placement readiness report...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <TranscriptPanel entries={transcript} liveSpeech={liveSpeech} />
      </div>
    </div>
  );
}
