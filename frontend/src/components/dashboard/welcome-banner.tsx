"use client";

import Link from "next/link";
import { Sparkles, Flame, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

interface WelcomeBannerProps {
  name: string;
  streak?: number;
  level?: number;
  xp?: number;
}

export function WelcomeBanner({
  name,
  streak = 47,
  level = 12,
  xp = 8450,
}: WelcomeBannerProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 p-8 text-white shadow-glow">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered
            </Badge>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              Level {level}
            </Badge>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            {greeting}, {name.split(" ")[0]}!
          </h2>
          <p className="mt-2 max-w-lg text-white/80">
            You&apos;re on fire! Keep your momentum going — complete 2 more tasks
            today to maintain your streak and unlock a new badge.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
            <Flame className="h-8 w-8 text-amber-300" />
            <div>
              <p className="text-2xl font-bold">{streak}</p>
              <p className="text-xs text-white/70">Day Streak</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
            <Zap className="h-8 w-8 text-yellow-300" />
            <div>
              <p className="text-2xl font-bold">{xp.toLocaleString()}</p>
              <p className="text-xs text-white/70">Total XP</p>
            </div>
          </div>
          <Button
            asChild
            variant="glass"
            className="bg-white text-indigo-600 hover:bg-white/90 font-semibold"
          >
            <Link href={ROUTES.learnCourses}>Continue Learning</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
