"use client";

import { Suspense } from "react";
import { Brain } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { StudentIntelligenceDashboard } from "@/components/twin/student-intelligence-dashboard";
import { ROUTES } from "@/lib/routes";

function TwinContent() {
  return (
    <InteractiveModulePage
      title="Student Intelligence Profile"
      subtitle="Your live AI Digital Twin — updated continuously from every interview, resume, and coding session."
      icon={Brain}
      gradient="from-violet-600 via-fuchsia-600 to-cyan-600"
      defaultTab="overview"
      actions={[
        { label: "AI Career Coach", href: ROUTES.aiCoach },
        { label: "Practice Interview", href: ROUTES.interviewStart },
        { label: "Update Resume", href: ROUTES.resumeBuilder },
      ]}
      tabs={[
        { id: "overview", label: "Overview", content: <StudentIntelligenceDashboard tab="overview" /> },
        { id: "skills", label: "Skill Signals", content: <StudentIntelligenceDashboard tab="skills" /> },
        { id: "history", label: "Activity Timeline", content: <StudentIntelligenceDashboard tab="history" /> },
      ]}
    />
  );
}

export default function TwinPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <TwinContent />
    </Suspense>
  );
}
