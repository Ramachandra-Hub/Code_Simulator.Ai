"use client";

import { Suspense } from "react";
import { PanelInterviewSession } from "@/components/interview/panel-interview-session";

export default function PanelInterviewPage() {
  return (
    <Suspense fallback={<div className="p-6 flex justify-center text-muted-foreground">Loading panel interview…</div>}>
      <div className="p-6">
        <PanelInterviewSession />
      </div>
    </Suspense>
  );
}
