"use client";

import { Suspense } from "react";
import { VoiceInterviewSession } from "@/components/interview/voice-interview-session";

export default function VoiceInterviewPage() {
  return (
    <Suspense fallback={<div className="p-6 flex justify-center"><span className="text-muted-foreground">Loading voice interview…</span></div>}>
      <VoiceInterviewSession />
    </Suspense>
  );
}
