"use client";

import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { LeaderboardRankingsPanel, LeaderboardAchievementsPanel } from "@/components/feature/tab-panels";
import { ROUTES } from "@/lib/routes";

function LeaderboardContent() {
  return (
    <InteractiveModulePage
      title="Gamification & Leaderboards"
      subtitle="Earn XP, unlock badges, and compete on global leaderboards."
      icon={Trophy}
      gradient="from-yellow-600 via-amber-600 to-orange-600"
      defaultTab="rankings"
      actions={[
        { label: "View Rankings", href: ROUTES.leaderboardRankings },
        { label: "My Achievements", href: ROUTES.leaderboardAchievements },
      ]}
      tabs={[
        { id: "rankings", label: "Rankings", content: <LeaderboardRankingsPanel /> },
        { id: "achievements", label: "Achievements", content: <LeaderboardAchievementsPanel /> },
      ]}
      sections={[
        { title: "Gamification", description: "Stay motivated.", items: ["XP Points", "Levels", "Badges", "Streaks"] },
        { title: "Leaderboards", description: "Compete globally.", items: ["Institution", "Department", "Batch", "Global"] },
      ]}
    />
  );
}

export default function LeaderboardPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><LeaderboardContent /></Suspense>;
}
