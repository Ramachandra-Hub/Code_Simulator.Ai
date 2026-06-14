"use client";

import { Suspense } from "react";
import { CodingInterviewSession } from "@/components/interview/coding-interview-session";
import { DashboardHeader } from "@/components/dashboard/header";

function CodingContent() {
  return (
    <div className="min-h-screen">
      <DashboardHeader title="Coding Interview" />
      <div className="p-6">
        <CodingInterviewSession />
      </div>
    </div>
  );
}

export default function CodingInterviewPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading coding interview...</div>}>
      <CodingContent />
    </Suspense>
  );
}
