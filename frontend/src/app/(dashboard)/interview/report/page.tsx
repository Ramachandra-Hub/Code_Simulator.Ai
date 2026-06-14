"use client";

import { Suspense } from "react";
import { Award } from "lucide-react";
import { InterviewReport } from "@/components/interview/interview-report";
import { DashboardHeader } from "@/components/dashboard/header";

function ReportContent() {
  return (
    <div className="min-h-screen">
      <DashboardHeader title="Placement Readiness Report" />
      <div className="p-6">
        <InterviewReport />
      </div>
    </div>
  );
}

export default function InterviewReportPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading report...</div>}>
      <ReportContent />
    </Suspense>
  );
}
