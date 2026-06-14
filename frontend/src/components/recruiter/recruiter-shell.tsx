"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  ListChecks,
  Radar,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const NAV = [
  { href: "/recruiter", label: "Overview", icon: LayoutDashboard },
  { href: "/recruiter/candidates", label: "Candidates", icon: Users },
  { href: "/recruiter/radar", label: "Talent Radar", icon: Radar },
  { href: "/recruiter/copilot", label: "AI Copilot", icon: Sparkles },
  { href: "/recruiter/jobs", label: "Jobs", icon: Briefcase },
  { href: "/recruiter/shortlists", label: "Shortlists", icon: ListChecks },
  { href: "/recruiter/analytics", label: "Analytics", icon: BarChart3 },
];

export function RecruiterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0d1424]/95 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-widest text-cyan-400/80">Talent Intelligence</p>
          <h1 className="mt-1 text-lg font-semibold text-white">{APP_NAME}</h1>
          <p className="text-xs text-slate-400">Recruiter Operating System</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/recruiter" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white ring-1 ring-cyan-500/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-slate-500">
          Powered by Digital Twin — not resume-only ranking
        </div>
      </aside>
      <main className="pl-64">{children}</main>
    </div>
  );
}
