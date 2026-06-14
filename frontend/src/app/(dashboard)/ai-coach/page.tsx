"use client";

import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { RatingFeedback } from "@/components/beta/feedback-widget";
import { CareerCoachPanel, CareerSkillGapPanel } from "@/components/career/career-coach-panels";
import { ROUTES } from "@/lib/routes";

function AICoachContent() {
  return (
    <InteractiveModulePage
      title="AI Career Coach"
      subtitle="Personalized career paths, skill gap analysis, and placement predictions."
      icon={Sparkles}
      gradient="from-violet-600 via-fuchsia-600 to-pink-600"
      defaultTab="recommendations"
      actions={[
        { label: "Get Recommendations", href: ROUTES.aiRecommendations },
        { label: "Skill Gap Analysis", href: ROUTES.aiSkillGap },
      ]}
      tabs={[
        { id: "recommendations", label: "Recommendations", content: <CareerCoachPanel /> },
        { id: "skill-gap", label: "Skill Gap", content: <CareerSkillGapPanel /> },
      ]}
      sections={[
        { title: "Guidance", description: "AI career planning.", items: ["Career Paths", "Role Recommendations", "Industry Trends"], badge: "AI" },
        { title: "Learning", description: "Curated suggestions.", items: ["Courses", "Certifications", "Projects", "Competitions"] },
      ]}
      footer={<RatingFeedback type="rate_career_coach" title="Rate your AI Career Coach experience" />}
    />
  );
}

export default function AICoachPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><AICoachContent /></Suspense>;
}
