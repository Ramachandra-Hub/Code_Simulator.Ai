"use client";

import { Suspense } from "react";
import { Mic } from "lucide-react";
import { InterviewHub } from "@/components/interview/interview-hub";

function InterviewPageContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
          <Mic className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Interview Room</h2>
          <p className="text-sm text-muted-foreground">
            Mock, coding, voice, and panel modes — questions generated from your resume, role, and twin
          </p>
        </div>
      </div>
      <InterviewHub />
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <InterviewPageContent />
    </Suspense>
  );
}
