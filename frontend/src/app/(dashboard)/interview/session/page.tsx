"use client";

import { Suspense } from "react";
import { Mic } from "lucide-react";
import { InterviewSession } from "@/components/interview/interview-session";
import { DashboardHeader } from "@/components/dashboard/header";

function SessionContent() {
  return (
    <div className="min-h-screen">
      <DashboardHeader title="AI Mock Interview" />
      <div className="p-6">
        <InterviewSession />
      </div>
    </div>
  );
}

export default function InterviewSessionPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading interview...</div>}>
      <SessionContent />
    </Suspense>
  );
}
