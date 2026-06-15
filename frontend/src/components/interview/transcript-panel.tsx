"use client";

import { memo, useEffect, useMemo, useRef } from "react";
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
  welcome: "Moderator",
  question: "Interviewer",
  feedback: "Feedback",
  answer: "You",
};

type SpeakerGroup = {
  speaker: string;
  role: "ai" | "student";
  entries: TranscriptEntry[];
};

function groupBySpeaker(entries: TranscriptEntry[]): SpeakerGroup[] {
  const groups: SpeakerGroup[] = [];
  for (const entry of entries) {
    const speaker = entry.speaker || KIND_LABEL[entry.kind];
    const last = groups[groups.length - 1];
    if (last && last.speaker === speaker && last.role === entry.role) {
      last.entries.push(entry);
    } else {
      groups.push({ speaker, role: entry.role, entries: [entry] });
    }
  }
  return groups;
}

function TranscriptPanelInner({ entries, liveSpeech }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupBySpeaker(entries), [entries]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, liveSpeech]);

  return (
    <Card className="glass-card h-full max-h-[600px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Meeting Transcript</CardTitle>
        <p className="text-xs text-muted-foreground">Grouped by speaker — questions reference earlier answers</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pr-2">
        {groups.length === 0 && !liveSpeech && (
          <p className="text-xs text-muted-foreground text-center py-8">Transcript will appear as you interview</p>
        )}
        {groups.map((group) => (
          <div key={`${group.speaker}-${group.entries[0]?.id}`} className="space-y-1.5">
            <div className={cn("flex items-center gap-2", group.role === "student" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  group.role === "ai" ? "bg-primary/20" : "bg-violet-500/20"
                )}
              >
                {group.role === "ai" ? (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <User className="h-3.5 w-3.5 text-violet-500" />
                )}
              </div>
              <p className="text-xs font-semibold text-muted-foreground">{group.speaker}</p>
            </div>
            <div className={cn("space-y-2", group.role === "student" ? "pl-0 pr-9" : "pl-9")}>
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm",
                    group.role === "ai"
                      ? entry.kind === "feedback"
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "bg-muted/60"
                      : "bg-violet-500/10 border border-violet-500/20"
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 opacity-60">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {liveSpeech && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-row-reverse">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                <User className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">You</p>
            </div>
            <div className="rounded-xl px-3 py-2 bg-violet-500/5 border border-dashed border-violet-500/30 mr-9">
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
