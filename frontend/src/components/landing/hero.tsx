"use client";

import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Code2,
  GraduationCap,
  Briefcase,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-24">
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="absolute right-0 top-1/2 h-[400px] w-[400px] rounded-full bg-cyan-500/15 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center">
          <Badge variant="gradient" className="mb-6 px-4 py-1.5 text-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            AI-Powered Career Ecosystem
          </Badge>

          <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-tight md:text-7xl text-balance">
            The Future of{" "}
            <span className="gradient-text">Learning & Placement</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            NexusEdge AI unifies coding practice, LMS, AI coaching, resume
            analysis, mock interviews, and placement management into one
            premium ecosystem.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="gradient" size="xl" asChild>
              <Link href="/login">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <Link href="/login?demo=true">View Demo Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-cyan-500/20 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-glass-lg backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="ml-4 text-xs text-muted-foreground">
                NexusEdge AI Dashboard
              </span>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-4">
              {[
                { label: "Career Score", value: "87%", icon: Brain, color: "from-violet-500 to-indigo-600" },
                { label: "Coding Score", value: "2,450", icon: Code2, color: "from-cyan-500 to-blue-600" },
                { label: "Courses", value: "68%", icon: GraduationCap, color: "from-emerald-500 to-teal-600" },
                { label: "Placements", value: "92%", icon: Briefcase, color: "from-amber-500 to-orange-600" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card p-4"
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="h-48 bg-gradient-to-t from-primary/5 to-transparent p-6">
              <div className="flex h-full items-end gap-2">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-lg bg-gradient-to-t from-violet-600 to-cyan-500 opacity-80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
