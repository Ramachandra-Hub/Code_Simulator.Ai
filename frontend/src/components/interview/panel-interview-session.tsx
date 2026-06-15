"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIMeetingRoom, type MeetingPhase } from "@/components/interview/ai-meeting-room";
import { TranscriptPanel, type TranscriptEntry } from "@/components/interview/transcript-panel";
import { useToast } from "@/hooks/use-toast";
import { friendlyApiError } from "@/lib/error-messages";
import { startPanelInterview, submitPanelTranscript, type PanelMemberInfo } from "@/lib/panel-client";
import { speakPanelTurn } from "@/lib/panel-voices";
import { ROUTES } from "@/lib/routes";
import { loadVoices, stopNaturalSpeech } from "@/lib/natural-speech";
import { PANEL_PERSONALITY_BY_PERSONA, pickThinkingMessage } from "@/lib/interview-personas";
import { InterviewRealismTracker, immersionThinkingDelay, detectContextReference } from "@/lib/interview-immersion";

function entryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type TurnPhase = "ai_speaking" | "your_turn" | "processing" | "complete" | "error";

export function PanelInterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const resumeId = searchParams.get("resume") || undefined;
  const initRef = useRef(false);

  const [panelSessionId, setPanelSessionId] = useState<string | null>(null);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelMemberInfo[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<{ id: string; name: string; role: string; voiceId?: string | null } | null>(null);
  const [progress, setProgress] = useState({ turnCount: 0, maxTurns: 8 });
  const [phase, setPhase] = useState<TurnPhase>("ai_speaking");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [statusHint, setStatusHint] = useState("Panel is joining...");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [spokenAnswer, setSpokenAnswer] = useState("");
  const [liveSpeech, setLiveSpeech] = useState("");
  const [creating, setCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const [realismTracker] = useState(() => new InterviewRealismTracker());
  const [realismScore, setRealismScore] = useState(0);
  const [thinkingStatus, setThinkingStatus] = useState<string | undefined>();

  const playPanelistQuestion = useCallback(
    async (opts: {
      question: string;
      speaker: { name: string; role: string; voiceId?: string | null };
      tts?: { audioBase64: string | null; useBrowserFallback?: boolean } | null;
      moderatorMessage?: string;
      moderatorTts?: { audioBase64: string | null; useBrowserFallback?: boolean } | null;
    }) => {
      setPhase("ai_speaking");
      setStatusHint(`${opts.speaker.name} is asking...`);
      setCurrentQuestion(opts.question);
      setSpokenAnswer("");
      setLiveSpeech("");
      await immersionThinkingDelay(600, 1600);

      await speakPanelTurn({
        moderatorMessage: opts.moderatorMessage,
        moderatorTts: opts.moderatorTts || undefined,
        question: opts.question,
        voiceId: opts.speaker.voiceId || "panel_hr_female",
        tts: opts.tts || undefined,
      });

      setPhase("your_turn");
      setStatusHint("Your turn — tap Start Speaking and answer this one question.");
    },
    []
  );

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    void loadVoices();
    let active = true;

    void (async () => {
      try {
        const result = await startPanelInterview({ resumeId, mode: "voice" });
        if (!active) return;

        setPanelSessionId(result.panelSessionId);
        setInterviewSessionId(result.interviewSessionId);
        setPanel(result.panel);
        setActiveSpeaker(result.activeSpeaker);
        setProgress(result.progress);

        setTranscript([
          {
            id: entryId(),
            role: "ai",
            kind: "welcome",
            text: result.moderatorMessage,
            speaker: "Moderator",
            timestamp: new Date().toISOString(),
          },
        ]);

        await playPanelistQuestion({
          question: result.firstQuestion,
          speaker: result.activeSpeaker,
          tts: result.tts,
          moderatorMessage: result.moderatorMessage,
          moderatorTts: result.moderatorTts,
        });

        if (!active) return;
        setTranscript((prev) => [
          ...prev,
          {
            id: entryId(),
            role: "ai",
            kind: "question",
            text: result.firstQuestion,
            speaker: result.activeSpeaker.name,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        if (!active) return;
        setError(friendlyApiError(err instanceof Error ? err.message : "Failed to start panel interview"));
        setPhase("error");
      } finally {
        if (active) setCreating(false);
      }
    })();

    return () => {
      active = false;
      stopNaturalSpeech();
    };
  }, [resumeId, playPanelistQuestion]);

  const handleSpeech = (text: string, isFinal: boolean) => {
    if (phase !== "your_turn") return;
    if (isFinal) {
      setSpokenAnswer((prev) => (prev ? `${prev} ${text}` : text).trim());
      setLiveSpeech("");
    } else {
      setLiveSpeech(text);
    }
  };

  const displayAnswer = liveSpeech ? `${spokenAnswer} ${liveSpeech}`.trim() : spokenAnswer;

  const handleAnswer = async () => {
    const trimmed = displayAnswer.trim();
    if (!panelSessionId || trimmed.length < 10) {
      toast({
        title: "Keep speaking",
        description: "Answer the current question in full sentences, then submit.",
        variant: "error",
      });
      return;
    }

    setPhase("processing");
    setThinkingStatus(pickThinkingMessage());
    setStatusHint("Panel is reviewing your answer...");
    setLiveSpeech("");
    await immersionThinkingDelay();
    setTranscript((prev) => [
      ...prev,
      { id: entryId(), role: "student", kind: "answer", text: trimmed, speaker: "You", timestamp: new Date().toISOString() },
    ]);

    try {
      const result = await submitPanelTranscript({ panelSessionId, transcript: trimmed });
      setProgress(result.progress);
      setActiveSpeaker(result.activeSpeaker);
      const pf = result.panelistFeedback as {
        hiringRecommendation?: string;
        feedback?: string;
        technicalScore?: number;
        communicationScore?: number;
        confidenceScore?: number;
      };
      setPanel((prev) =>
        prev.map((p) =>
          p.id === result.activeSpeaker.id
            ? {
                ...p,
                hiringRecommendation: pf.hiringRecommendation,
                feedback: pf.feedback,
                technicalScore: pf.technicalScore,
                communicationScore: pf.communicationScore,
                confidenceScore: pf.confidenceScore,
              }
            : p
        )
      );
      setInterrupted(result.interrupted);
      setSpokenAnswer("");
      realismTracker.recordTurn();
      if (result.interrupted) realismTracker.recordInterruption();
      if (result.realism) realismTracker.merge(result.realism);
      if (result.realismScore != null) setRealismScore(result.realismScore);
      else setRealismScore(realismTracker.getScore());

      if (result.interrupted) {
        toast({ title: "Panel interruption", description: "A panelist is redirecting the discussion", variant: "error" });
      }

      if (result.phase === "complete") {
        setPhase("complete");
        toast({ title: "Panel complete", description: "Generating your report..." });
        router.push(`${ROUTES.interviewReport}?id=${interviewSessionId}`);
        return;
      }

      if (result.nextQuestion) {
        if (detectContextReference(result.nextQuestion)) {
          realismTracker.recordQuestion(result.nextQuestion);
        }
        setTranscript((prev) => [
          ...prev,
          {
            id: entryId(),
            role: "ai",
            kind: "question",
            text: result.nextQuestion!,
            speaker: result.activeSpeaker.name,
            timestamp: new Date().toISOString(),
          },
        ]);
        await playPanelistQuestion({
          question: result.nextQuestion,
          speaker: result.activeSpeaker,
          tts: result.tts,
        });
        setThinkingStatus(undefined);
      } else {
        setPhase("your_turn");
      }
    } catch (err) {
      toast({ title: "Error", description: friendlyApiError(err instanceof Error ? err.message : "Failed"), variant: "error" });
      setPhase("your_turn");
      setStatusHint("Your turn — tap Start Speaking and answer.");
    }
  };

  const submitting = phase === "processing";
  const yourTurn = phase === "your_turn";

  if (creating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{statusHint}</p>
      </div>
    );
  }

  if (error || phase === "error") {
    return (
      <div className="p-6 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push(ROUTES.interview)}>Back to Interviews</Button>
      </div>
    );
  }

  const meetingPhase: MeetingPhase =
    phase === "ai_speaking" ? "ai_speaking" : phase === "your_turn" ? "your_turn" : phase === "processing" ? "processing" : "complete";

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <AIMeetingRoom
          title="Panel Interview Room"
          participants={panel.map((m) => {
            const traits = PANEL_PERSONALITY_BY_PERSONA[m.persona] || PANEL_PERSONALITY_BY_PERSONA.hr;
            return {
              id: m.id,
              name: m.name,
              role: m.role,
              isInterviewer: true,
              personality: traits.personality,
              personalityLabel: traits.personalityLabel,
            };
          })}
          activeSpeakerId={activeSpeaker?.id || null}
          phase={meetingPhase}
          currentQuestion={currentQuestion}
          statusHint={statusHint}
          thinkingStatus={thinkingStatus}
          realismScore={realismScore}
          progress={{ current: progress.turnCount + 1, total: progress.maxTurns }}
          spokenAnswer={spokenAnswer}
          liveSpeech={yourTurn ? liveSpeech : ""}
          onSpeech={yourTurn ? handleSpeech : undefined}
          onSpeechError={(msg) => toast({ title: "Voice input", description: msg, variant: "error" })}
          onSubmit={() => void handleAnswer()}
          submitDisabled={submitting || displayAnswer.trim().length < 10}
          transcriptPanel={<TranscriptPanel entries={transcript} liveSpeech={yourTurn ? liveSpeech : ""} />}
        />
        {interrupted && <p className="text-xs text-amber-600 text-center">Panel interrupted — expect a direct follow-up</p>}
      </div>

      <div className="space-y-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Panel Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {panel.filter((p) => p.technicalScore).length === 0 ? (
              <p className="text-muted-foreground text-xs">Scores appear after each answer</p>
            ) : (
              panel
                .filter((p) => p.technicalScore)
                .map((p) => (
                  <div key={p.id} className="border-b border-border/50 pb-2 last:border-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.role}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tech {p.technicalScore} · Comm {p.communicationScore} · Conf {p.confidenceScore}
                    </p>
                    {p.hiringRecommendation && (
                      <Badge variant="outline" className="mt-1 text-[10px]">{p.hiringRecommendation.replace("_", " ")}</Badge>
                    )}
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
