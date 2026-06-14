"use client";

import { Suspense } from "react";
import { ScanSearch } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { ATSAnalyzePanel, ATSReportPanel } from "@/components/feature/tab-panels";
import { ROUTES } from "@/lib/routes";

function ATSContent() {
  return (
    <InteractiveModulePage
      title="ATS Resume Analyzer"
      subtitle="Upload and analyze resumes for ATS compatibility, keywords, and improvements."
      icon={ScanSearch}
      gradient="from-purple-600 via-violet-600 to-indigo-600"
      defaultTab="analyze"
      actions={[
        { label: "Upload Resume", href: ROUTES.atsAnalyze },
        { label: "View Report", href: ROUTES.atsReport },
      ]}
      tabs={[
        { id: "analyze", label: "Analyze", content: <ATSAnalyzePanel /> },
        { id: "report", label: "Report", content: <ATSReportPanel /> },
      ]}
      sections={[
        { title: "Analysis", description: "What we check.", items: ["ATS Score", "Keywords", "Formatting", "Grammar", "Missing Skills"] },
        { title: "Recommendations", description: "Improvement tips.", items: ["Keyword Suggestions", "Format Fixes", "Priority Actions"], badge: "AI" },
      ]}
    />
  );
}

export default function ATSPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><ATSContent /></Suspense>;
}
