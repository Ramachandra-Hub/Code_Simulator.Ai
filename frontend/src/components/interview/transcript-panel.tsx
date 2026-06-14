"use client";

import { memo, useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TranscriptEntry = {
  id: string;
  role: "ai" | "student";
  kind: "welcome" | "question" | "feedback" | "answer";
  text: string;
  timestamp: string;
  speaker?: string;
};

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  liveSpeech: string;
}

const KIND_LABEL: Record<TranscriptEntry["kind"], string> = {
  welcome: "AI Interviewer",
  question: "AI Interviewer",
  feedback: "AI Feedback",
  answer: "You",
};

function TranscriptPanelInner({ entries, liveSpeech }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, liveSpeech]);

  return (
    <Card className="glass-card h-full max-h-[600px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Live Transcript</CardTitle>
        <p className="text-xs text-muted-foreground">Questions, answers, and feedback appear here</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3 pr-2">
        {entries.length === 0 && !liveSpeech && (
          <p className="text-xs text-muted-foreground text-center py-8">Transcript will appear as you interview</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={cn("flex gap-2 text-sm", entry.role === "ai" ? "flex-row" : "flex-row-reverse")}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                entry.role === "ai" ? "bg-primary/20" : "bg-violet-500/20"
              )}
            >
              {entry.role === "ai" ? (
                <Bot className="h-3.5 w-3.5 text-primary" />
              ) : (
                <User className="h-3.5 w-3.5 text-violet-500" />
              )}
            </div>
            <div
              className={cn(
                "rounded-xl px-3 py-2 max-w-[85%]",
                entry.role === "ai"
                  ? entry.kind === "feedback"
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-muted/60"
                  : "bg-violet-500/10 border border-violet-500/20"
              )}
            >
              <p className="text-xs font-medium mb-0.5 opacity-60">
                {entry.speaker || KIND_LABEL[entry.kind]}
              </p>
              <p className="leading-relaxed whitespace-pre-wrap">{entry.text}</p>
            </div>
          </div>
        ))}
        {liveSpeech && (
          <div className="flex gap-2 flex-row-reverse">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
              <User className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <div className="rounded-xl px-3 py-2 bg-violet-500/5 border border-dashed border-violet-500/30 max-w-[85%]">
              <p className="text-xs text-violet-500 animate-pulse">Speaking...</p>
              <p className="text-sm italic">{liveSpeech}</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </CardContent>
    </Card>
  );
}

export const TranscriptPanel = memo(TranscriptPanelInner);
