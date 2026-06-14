"use client";

import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { AssessmentsTakePanel, QuestionBankPanel } from "@/components/feature/tab-panels";
import { ROUTES } from "@/lib/routes";

function AssessmentsContent() {
  return (
    <InteractiveModulePage
      title="Assessment System"
      subtitle="MCQ, aptitude, technical, coding, and subjective assessments with proctoring."
      icon={ClipboardCheck}
      gradient="from-amber-600 via-orange-600 to-rose-600"
      defaultTab="take"
      actions={[
        { label: "Take Assessment", href: ROUTES.assessmentsTake },
        { label: "Question Bank", href: ROUTES.assessmentsBank },
      ]}
      tabs={[
        { id: "take", label: "Take Assessment", content: <AssessmentsTakePanel /> },
        { id: "bank", label: "Question Bank", content: <QuestionBankPanel /> },
      ]}
      sections={[
        { title: "Types", description: "Assessment formats.", items: ["MCQ", "Aptitude", "Technical", "Coding", "Subjective"] },
        { title: "Proctoring", description: "Secure testing.", items: ["Browser Monitor", "Tab Detection", "Auto Evaluation"], badge: "Secure" },
      ]}
    />
  );
}

export default function AssessmentsPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><AssessmentsContent /></Suspense>;
}
