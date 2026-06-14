"use client";

import Link from "next/link";
import {
  Code2,
  GraduationCap,
  FileText,
  Mic,
  Building2,
  Brain,
  Trophy,
  BarChart3,
  Sparkles,
  GitBranch,
  Briefcase,
  ScanSearch,
} from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "Learning Management",
    description: "Video courses, coding labs, skill trees, learning paths, and AI-powered tutoring.",
    gradient: "from-violet-500 to-indigo-600",
    href: "/login",
  },
  {
    icon: Code2,
    title: "Coding Ecosystem",
    description: "Online compiler, DSA practice, hidden test cases, and complexity analysis.",
    gradient: "from-cyan-500 to-blue-600",
    href: "/login",
  },
  {
    icon: Brain,
    title: "AI Career Coach",
    description: "Personalized career paths, skill gap analysis, and placement predictions.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: FileText,
    title: "Resume Builder",
    description: "ATS-optimized resumes with AI generation and role-specific templates.",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: ScanSearch,
    title: "ATS Analyzer",
    description: "Upload and analyze resumes for ATS compatibility, keywords, and formatting.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Mic,
    title: "Mock Interviews",
    description: "AI-powered HR, technical, and coding interviews with detailed feedback.",
    gradient: "from-purple-500 to-violet-600",
  },
  {
    icon: Building2,
    title: "Placement Management",
    description: "Company drives, eligibility tracking, interview scheduling, and analytics.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: Briefcase,
    title: "Recruiter Portal",
    description: "Search talent by skills, ATS score, coding score, and view portfolios.",
    gradient: "from-teal-500 to-cyan-600",
  },
  {
    icon: GitBranch,
    title: "Coding Profiles",
    description: "Unified profile integrating GitHub, LeetCode, CodeChef, and more.",
    gradient: "from-fuchsia-500 to-purple-600",
  },
  {
    icon: Trophy,
    title: "Gamification",
    description: "XP, levels, badges, streaks, and leaderboards across institutions.",
    gradient: "from-yellow-500 to-amber-600",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Deep analytics for students, faculty, admins, and placement officers.",
    gradient: "from-slate-500 to-zinc-600",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description: "Generate questions, assignments, rubrics, and explain concepts instantly.",
    gradient: "from-violet-500 to-cyan-500",
    href: "/login",
  },
].map((f) => ({ ...f, href: f.href ?? "/login" }));

export function Features() {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Everything You Need,{" "}
            <span className="gradient-text">One Platform</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            From learning to placement — NexusEdge AI covers every step of the
            career journey with enterprise-grade tools.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group glass-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg block"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg transition-transform group-hover:scale-110`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
