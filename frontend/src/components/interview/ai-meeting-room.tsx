"use client";

import { Mic, MicOff, User, Volume2, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SpeechInput } from "@/components/interview/speech-input";

export type MeetingPhase = "ai_speaking" | "your_turn" | "processing" | "listening" | "complete";

export interface MeetingParticipant {
  id: string;
  name: string;
  role: string;
  isInterviewer?: boolean;
  avatarInitials?: string;
}

export interface AIMeetingRoomProps {
  title?: string;
  participants: MeetingParticipant[];
  activeSpeakerId: string | null;
  candidateName?: string;
  phase: MeetingPhase;
  currentQuestion?: string;
  statusHint?: string;
  progress?: { current: number; total: number };
  spokenAnswer?: string;
  liveSpeech?: string;
  onSpeech?: (text: string, isFinal: boolean) => void;
  onSpeechError?: (msg: string) => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  showSubmit?: boolean;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ParticipantTile({
  participant,
  isActive,
  isCandidate,
  phase,
}: {
  participant: MeetingParticipant;
  isActive: boolean;
  isCandidate: boolean;
  phase: MeetingPhase;
}) {
  const speaking = isActive && (phase === "ai_speaking" || (isCandidate && phase === "your_turn" && false));
  const listening = isCandidate && phase === "ai_speaking";
  const candidateSpeaking = isCandidate && phase === "your_turn";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-end rounded-2xl border bg-gradient-to-b from-slate-800/90 to-slate-900 p-3 min-h-[140px] transition-all duration-300",
        isActive && !isCandidate && "ring-2 ring-primary shadow-[0_0_24px_rgba(139,92,246,0.45)] border-primary/50",
        candidateSpeaking && "ring-2 ring-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] border-emerald-500/50",
        listening && isCandidate && "ring-1 ring-blue-400/40 border-blue-400/30"
      )}
    >
      {/* Speaking pulse */}
      {speaking && (
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      )}

      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold mb-2 transition-transform",
          isCandidate ? "bg-emerald-600/80 text-white" : "bg-violet-600/70 text-white",
          speaking && "scale-105",
          candidateSpeaking && "scale-105 animate-pulse"
        )}
      >
        {participant.avatarInitials || initials(participant.name)}
      </div>

      <p className="text-sm font-semibold text-white truncate max-w-full text-center">{participant.name}</p>
      <p className="text-[10px] text-slate-400 truncate max-w-full text-center">{participant.role}</p>

      <div className="mt-2 flex items-center gap-1">
        {speaking && (
          <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 gap-0.5">
            <Volume2 className="h-2.5 w-2.5" /> Speaking
          </Badge>
        )}
        {listening && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-300">
            Listening
          </Badge>
        )}
        {candidateSpeaking && (
          <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4 gap-0.5">
            <Mic className="h-2.5 w-2.5" /> Your turn
          </Badge>
        )}
        {phase === "processing" && isActive && !isCandidate && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-slate-300 border-slate-600">
            <Loader2 className="h-2.5 w-2.5 animate-spin mr-0.5" /> Thinking
          </Badge>
        )}
      </div>
    </div>
  );
}

export function AIMeetingRoom({
  title = "AI Interview Room",
  participants,
  activeSpeakerId,
  candidateName = "You",
  phase,
  currentQuestion,
  statusHint,
  progress,
  spokenAnswer = "",
  liveSpeech = "",
  onSpeech,
  onSpeechError,
  onSubmit,
  submitDisabled,
  showSubmit = true,
}: AIMeetingRoomProps) {
  const interviewers = participants.filter((p) => p.isInterviewer !== false && p.id !== "candidate");
  const displayAnswer = liveSpeech ? `${spokenAnswer} ${liveSpeech}`.trim() : spokenAnswer;
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-slate-950 text-white overflow-hidden shadow-2xl">
      {/* Meeting header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-red-500 animate-pulse" />
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
            {phase === "ai_speaking" ? "Interviewer speaking" : phase === "your_turn" ? "Your turn" : phase === "processing" ? "Processing" : "Live"}
          </Badge>
        </div>
        {progress && (
          <span className="text-xs text-slate-400">
            Question {progress.current}/{progress.total}
          </span>
        )}
      </div>

      {progress && <Progress value={pct} className="h-1 rounded-none bg-slate-800" />}

      {/* Zoom-style grid */}
      <div className="p-4 space-y-4">
        <div
          className={cn(
            "grid gap-3",
            interviewers.length <= 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"
          )}
        >
          {interviewers.map((p) => (
            <ParticipantTile
              key={p.id}
              participant={p}
              isActive={p.id === activeSpeakerId}
              isCandidate={false}
              phase={phase}
            />
          ))}
          <ParticipantTile
            participant={{ id: "candidate", name: candidateName, role: "Candidate", isInterviewer: false }}
            isActive={phase === "your_turn"}
            isCandidate
            phase={phase}
          />
        </div>

        {/* Active question caption */}
        {currentQuestion && (
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Current question</p>
            <p className="text-sm leading-relaxed text-slate-100">{currentQuestion}</p>
          </div>
        )}

        {statusHint && (
          <p className="text-xs text-center text-slate-400">{statusHint}</p>
        )}

        {/* Candidate controls — only when it's their turn */}
        {phase === "your_turn" && onSpeech && (
          <div className="rounded-xl bg-slate-800/40 border border-emerald-500/20 p-4 space-y-3">
            {displayAnswer ? (
              <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3 text-sm text-slate-200 min-h-[48px]">
                {displayAnswer}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">Tap Start Speaking to answer</p>
            )}
            <SpeechInput onTranscript={onSpeech} onError={onSpeechError} disabled={false} />
            {showSubmit && onSubmit && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                disabled={submitDisabled || displayAnswer.trim().length < 10}
                onClick={onSubmit}
              >
                <Mic className="mr-2 h-4 w-4" /> Submit answer
              </Button>
            )}
          </div>
        )}

        {phase === "ai_speaking" && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400">
            <Volume2 className="h-4 w-4 animate-pulse text-primary" />
            Please listen — you will answer when the interviewer finishes
          </div>
        )}

        {phase === "processing" && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Panel is reviewing your answer...
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 bg-slate-900/90 border-t border-slate-800">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            phase === "your_turn" ? "bg-emerald-600" : "bg-slate-700"
          )}
        >
          {phase === "your_turn" ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-slate-400" />}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
          <User className="h-5 w-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
