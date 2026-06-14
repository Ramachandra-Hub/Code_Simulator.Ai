"use client";

import { Suspense } from "react";
import { FileText } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { AIResumeBuilder } from "@/components/resume/ai-resume-builder";
import { ResumeListPanel } from "@/components/feature/tab-panels";
import { ROUTES } from "@/lib/routes";

function ResumeContent() {
  return (
    <InteractiveModulePage
      title="AI Resume Builder"
      subtitle="Create professional, ATS-optimized resumes with AI and role-specific templates."
      icon={FileText}
      gradient="from-rose-600 via-pink-600 to-purple-600"
      defaultTab="builder"
      actions={[
        { label: "Create Resume", href: ROUTES.resumeBuilder },
        { label: "My Resumes", href: ROUTES.resumeList },
      ]}
      tabs={[
        { id: "builder", label: "Builder", content: <AIResumeBuilder /> },
        { id: "list", label: "My Resumes", content: <ResumeListPanel /> },
      ]}
      sections={[
        { title: "Templates", description: "Role-specific templates.", items: ["Software Engineer", "Data Scientist", "AI Engineer", "Product Manager"] },
        { title: "AI Features", description: "AI-powered resume.", items: ["AI Content", "ATS Optimization", "Keyword Suggestions"], badge: "AI" },
      ]}
    />
  );
}

export default function ResumePage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><ResumeContent /></Suspense>;
}
