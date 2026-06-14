"use client";

import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { PlacementsDrivesPanel, PlacementsApplicationsPanel } from "@/components/feature/tab-panels";
import { ROUTES } from "@/lib/routes";

function PlacementsContent() {
  return (
    <InteractiveModulePage
      title="Placement Management"
      subtitle="Company drives, applications, interview scheduling, and placement analytics."
      icon={Building2}
      gradient="from-amber-600 via-yellow-600 to-orange-600"
      defaultTab="drives"
      actions={[
        { label: "View Drives", href: ROUTES.placementsDrives },
        { label: "My Applications", href: ROUTES.placementsApplications },
      ]}
      tabs={[
        { id: "drives", label: "Drives", content: <PlacementsDrivesPanel /> },
        { id: "applications", label: "Applications", content: <PlacementsApplicationsPanel /> },
      ]}
      sections={[
        { title: "Drives", description: "Placement drives.", items: ["Company Drives", "Eligibility", "Applications", "Deadlines"] },
        { title: "Reports", description: "Analytics.", items: ["Placement %", "Salary Analytics", "Branch Reports"] },
      ]}
    />
  );
}

export default function PlacementsPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><PlacementsContent /></Suspense>;
}
