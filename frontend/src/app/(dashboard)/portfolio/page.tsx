"use client";

import { Suspense } from "react";
import { Briefcase } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { PortfolioBuilderPanel, PortfolioSharePanel } from "@/components/feature/tab-panels";
import { ROUTES } from "@/lib/routes";

function PortfolioContent() {
  return (
    <InteractiveModulePage
      title="Video Portfolio"
      subtitle="Create a stunning professional portfolio with projects, skills, and coding profiles."
      icon={Briefcase}
      gradient="from-teal-600 via-cyan-600 to-blue-600"
      defaultTab="builder"
      actions={[
        { label: "Build Portfolio", href: ROUTES.portfolioBuilder },
        { label: "Share Link", href: ROUTES.portfolioShare },
      ]}
      tabs={[
        { id: "builder", label: "Builder", content: <PortfolioBuilderPanel /> },
        { id: "share", label: "Share", content: <PortfolioSharePanel /> },
      ]}
      sections={[
        { title: "Sections", description: "Portfolio content.", items: ["Intro Video", "Resume", "Projects", "Certificates", "Skills"] },
        { title: "Integrations", description: "Connect profiles.", items: ["GitHub", "LeetCode", "LinkedIn", "CodeChef", "HackerRank"] },
      ]}
    />
  );
}

export default function PortfolioPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><PortfolioContent /></Suspense>;
}
