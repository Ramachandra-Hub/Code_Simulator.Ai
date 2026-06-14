"use client";

import { Suspense } from "react";
import { Mic } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { InterviewTypeSelect } from "@/components/interview/interview-type-select";
import { InterviewHistoryPanel } from "@/components/feature/tab-panels";
import { StudentJourney } from "@/components/dashboard/student-journey";
import { ROUTES } from "@/lib/routes";

function InterviewContent() {
  return (
    <div className="space-y-6">
      <StudentJourney currentStepId="interview" completedStepIds={["learning", "assessment", "resume"]} />
      <InteractiveModulePage
      title="AI Mock Interview"
      subtitle="Practice HR, technical, and panel interviews by speaking — AI listens and responds with natural voices."
      icon={Mic}
      gradient="from-indigo-600 via-purple-600 to-pink-600"
      defaultTab="start"
      actions={[
        { label: "Start Interview", href: ROUTES.interviewStart },
        { label: "Past Sessions", href: ROUTES.interviewHistory },
      ]}
      tabs={[
        { id: "start", label: "Start", content: <InterviewTypeSelect /> },
        { id: "history", label: "History", content: <InterviewHistoryPanel /> },
      ]}
      sections={[
        { title: "Types", description: "Interview modes.", items: ["HR", "Technical", "Coding", "System Design", "Behavioral"] },
        { title: "Evaluation", description: "AI feedback.", items: ["Communication", "Confidence", "Technical Knowledge", "Fluency"], badge: "AI" },
      ]}
    />
    </div>
  );
}

export default function InterviewPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><InterviewContent /></Suspense>;
}
