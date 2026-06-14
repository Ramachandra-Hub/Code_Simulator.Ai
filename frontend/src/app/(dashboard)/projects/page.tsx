"use client";

import { Suspense } from "react";
import { FolderKanban } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { ProjectsNewPanel, ProjectsExplorePanel } from "@/components/feature/tab-panels";
import { ROUTES } from "@/lib/routes";

function ProjectsContent() {
  return (
    <InteractiveModulePage
      title="Project Showcase Hub"
      subtitle="Upload projects, get innovation scores, and gain recruiter visibility."
      icon={FolderKanban}
      gradient="from-blue-600 via-indigo-600 to-violet-600"
      defaultTab="new"
      actions={[
        { label: "Add Project", href: ROUTES.projectsNew },
        { label: "Explore", href: ROUTES.projectsExplore },
      ]}
      tabs={[
        { id: "new", label: "Add Project", content: <ProjectsNewPanel /> },
        { id: "explore", label: "Explore", content: <ProjectsExplorePanel /> },
      ]}
      sections={[
        { title: "Upload", description: "Showcase work.", items: ["Project Files", "GitHub Links", "Documentation", "Demo Videos"] },
        { title: "Categories", description: "Project domains.", items: ["Web Dev", "Mobile", "AI/ML", "IoT", "Blockchain"] },
      ]}
    />
  );
}

export default function ProjectsPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><ProjectsContent /></Suspense>;
}
