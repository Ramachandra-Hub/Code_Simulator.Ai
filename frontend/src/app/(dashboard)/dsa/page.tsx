"use client";

import { Suspense } from "react";
import { GitBranch } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { DSAPracticePanel, DSARoadmapPanel } from "@/components/feature/tab-panels";
import { DSA_TOPICS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";

function DSAContent() {
  return (
    <InteractiveModulePage
      title="DSA Practice System"
      subtitle="Topic-wise roadmaps, progress tracking, and AI-powered hints."
      icon={GitBranch}
      gradient="from-emerald-600 via-teal-600 to-cyan-600"
      defaultTab="practice"
      actions={[
        { label: "Start Practice", href: ROUTES.dsaPractice },
        { label: "View Roadmap", href: ROUTES.dsaRoadmap },
      ]}
      tabs={[
        { id: "practice", label: "Practice", content: <DSAPracticePanel /> },
        { id: "roadmap", label: "Roadmap", content: <DSARoadmapPanel /> },
      ]}
      sections={[
        { title: "Topics", description: "All DSA topics.", items: DSA_TOPICS, badge: "10 Topics" },
        { title: "AI Help", description: "Get unstuck fast.", items: ["AI Hints", "Step-by-step Solutions", "Optimal Approaches"], badge: "AI" },
      ]}
    />
  );
}

export default function DSAPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><DSAContent /></Suspense>;
}
