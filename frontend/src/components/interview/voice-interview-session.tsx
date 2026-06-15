"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIMeetingRoom, type MeetingPhase } from "@/components/interview/ai-meeting-room";
import { TranscriptPanel, type TranscriptEntry } from "@/components/interview/transcript-panel";
import { useToast } from "@/hooks/use-toast";
import { friendlyApiError } from "@/lib/error-messages";
import {
  startVoiceInterview,
  submitVoiceTranscript,
  speakInterviewText,
  type VoiceProfile,
} from "@/lib/voice-client";
import { VOICE_INTERVIEW_TYPES } from "@/lib/interview-types";
import { ROUTES } from "@/lib/routes";
import { loadVoices } from "@/lib/natural-speech";

import { getInterviewerPersona, pickThinkingMessage } from "@/lib/interview-personas";
import {
  InterviewRealismTracker,
  immersionThinkingDelay,
  detectContextReference,
} from "@/lib/interview-immersion";

function entryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type VoicePhase = "ai_speaking" | "your_turn" | "processing" | "completing" | "error";

export function VoiceInterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const type = searchParams.get("type") || "technical";
  const resumeId = searchParams.get("resume") || undefined;
  const voiceProfile = (searchParams.get("voice") || "professional") as VoiceProfile;

  const persona = getInterviewerPersona(type);

  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [progress, setProgress] = useState({ questionIndex: 0, maxQuestions: 6, followUpCount: 0, difficulty: "medium" });
  const [phase, setPhase] = useState<VoicePhase>("ai_speaking");
  const [statusHint, setStatusHint] = useState("Interviewer is joining...");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [spokenAnswer, setSpokenAnswer] = useState("");
  const [liveSpeech, setLiveSpeech] = useState("");
  const [creating, setCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realismTracker] = useState(() => new InterviewRealismTracker());
  const [realismScore, setRealismScore] = useState(0);
  const [thinkingStatus, setThinkingStatus] = useState<string | undefined>();

  const validType = VOICE_INTERVIEW_TYPES.some((t) => t.id === type);

  const initSession = useCallback(async () => {
    if (!validType) {
      setError("Invalid voice interview type");
      setCreating(false);
      return;
    }
    try {
      setPhase("ai_speaking");
      setStatusHint(`${persona.name} is joining the room...`);
      await immersionThinkingDelay(800, 1800);
      const result = await startVoiceInterview({ type, resumeId, voiceProfile });
      setVoiceSessionId(result.voiceSessionId);
      setInterviewSessionId(result.interviewSessionId);
      setCurrentQuestion(result.firstQuestion);
      setProgress(result.progress);
      setTranscript([
        {
          id: entryId(),
          role: "ai",
          kind: "question",
          text: result.firstQuestion,
          speaker: persona.name,
          timestamp: new Date().toISOString(),
        },
      ]);
      realismTracker.recordQuestion(result.firstQuestion);
      setRealismScore(realismTracker.getScore());
      setStatusHint(`${persona.name} is asking the first question...`);
      await immersionThinkingDelay();
      await speakInterviewText(result.firstQuestion, result.tts, voiceProfile);
      setPhase("your_turn");
      setStatusHint("Your turn — answer the question, then submit.");
    } catch (err) {
      setError(friendlyApiError(err instanceof Error ? err.message : "Failed to start voice interview"));
      setPhase("error");
    } finally {
      setCreating(false);
    }
  }, [type, resumeId, voiceProfile, validType, persona.name, realismTracker]);

  useEffect(() => {
    void loadVoices();
    void initSession();
  }, [initSession]);

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

  const submitAnswer = async () => {
    if (!voiceSessionId || displayAnswer.trim().length < 10) {
      toast({
        title: "Keep speaking",
        description: "Answer in full sentences, then tap Submit.",
        variant: "error",
      });
      return;
    }

    setPhase("processing");
    setThinkingStatus(pickThinkingMessage());
    setStatusHint(`${persona.name} is reviewing your answer...`);
    setLiveSpeech("");

    await immersionThinkingDelay();

    try {
      const result = await submitVoiceTranscript({
        voiceSessionId,
        transcript: displayAnswer.trim(),
      });

      setTranscript((prev) => [
        ...prev,
        {
          id: entryId(),
          role: "student",
          kind: "answer",
          text: result.transcript,
          timestamp: new Date().toISOString(),
        },
      ]);
      setProgress(result.progress);
      setSpokenAnswer("");
      realismTracker.recordTurn();
      if (result.realism) realismTracker.merge(result.realism);
      if (result.progress?.followUpCount > 0) realismTracker.recordFollowUp();

      if (result.phase === "complete") {
        setPhase("completing");
        router.push(`${ROUTES.interviewReport}?id=${interviewSessionId}`);
        return;
      }

      if (result.nextQuestion) {
        if (detectContextReference(result.nextQuestion)) {
          realismTracker.recordQuestion(result.nextQuestion);
        }
        if (result.progress?.followUpCount > 0) realismTracker.recordFollowUp();
        setRealismScore(realismTracker.getScore());

        setPhase("ai_speaking");
        setThinkingStatus(undefined);
        setStatusHint(`${persona.name} is preparing the next question...`);
        await immersionThinkingDelay(1000, 2500);
        setCurrentQuestion(result.nextQuestion);
        setTranscript((prev) => [
          ...prev,
          {
            id: entryId(),
            role: "ai",
            kind: "question",
            text: result.nextQuestion!,
            speaker: persona.name,
            timestamp: new Date().toISOString(),
          },
        ]);
        if (result.tts) await speakInterviewText(result.nextQuestion, result.tts, voiceProfile);
        setPhase("your_turn");
        setStatusHint("Your turn — answer the question.");
      }
    } catch (err) {
      setError(friendlyApiError(err instanceof Error ? err.message : "Failed to process answer"));
      setPhase("error");
    }
  };

  if (creating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{statusHint}</p>
      </div>
    );
  }

  if (error || !validType) {
    return (
      <Card className="glass-card max-w-lg mx-auto mt-8">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <p className="text-muted-foreground">{error || "Invalid interview type"}</p>
          <Button variant="outline" onClick={() => router.push(ROUTES.interview)}>
            Back to Interviews
          </Button>
        </CardContent>
      </Card>
    );
  }

  const meetingPhase: MeetingPhase =
    phase === "ai_speaking" ? "ai_speaking" : phase === "your_turn" ? "your_turn" : phase === "processing" ? "processing" : "complete";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <AIMeetingRoom
        title={`${type.replace(/_/g, " ")} Interview`}
        participants={[
          {
            id: "interviewer",
            name: persona.name,
            role: persona.role,
            isInterviewer: true,
            personality: persona.personality,
            personalityLabel: persona.personalityLabel,
            avatarInitials: persona.avatarInitials,
          },
        ]}
        activeSpeakerId={phase === "your_turn" ? "candidate" : "interviewer"}
        phase={meetingPhase}
        currentQuestion={currentQuestion}
        statusHint={statusHint}
        thinkingStatus={thinkingStatus}
        realismScore={realismScore}
        progress={{ current: progress.questionIndex + 1, total: progress.maxQuestions }}
        spokenAnswer={spokenAnswer}
        liveSpeech={phase === "your_turn" ? liveSpeech : ""}
        onSpeech={phase === "your_turn" ? handleSpeech : undefined}
        onSpeechError={(msg) => toast({ title: "Voice input", description: msg, variant: "error" })}
        onSubmit={() => void submitAnswer()}
        submitDisabled={phase !== "your_turn" || displayAnswer.trim().length < 10}
        transcriptPanel={
          <TranscriptPanel entries={transcript} liveSpeech={phase === "your_turn" ? liveSpeech : ""} />
        }
      />

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => interviewSessionId && router.push(`${ROUTES.interviewReport}?id=${interviewSessionId}`)}
        >
          End Early <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
