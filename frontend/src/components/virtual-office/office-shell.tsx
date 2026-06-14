"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CheckSquare,
  GitPullRequest,
  LayoutDashboard,
  MessageSquare,
  Mic,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/office", label: "Overview", icon: LayoutDashboard },
  { href: "/office/work", label: "Today's Work", icon: CheckSquare },
  { href: "/office/meetings", label: "Meetings", icon: Users },
  { href: "/office/standups", label: "Standups", icon: MessageSquare },
  { href: "/office/tasks", label: "Tasks", icon: Calendar },
  { href: "/office/code-reviews", label: "Code Reviews", icon: GitPullRequest },
  { href: "/office/performance", label: "Performance", icon: BarChart3 },
  { href: "/office/promotion", label: "Promotion Readiness", icon: TrendingUp },
];

export function OfficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full">
      <div className="border-b border-border/60 bg-gradient-to-r from-slate-800/20 via-blue-600/10 to-indigo-500/10 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400">Virtual Office</p>
        <h1 className="text-2xl font-bold">AI Company Simulator</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Experience startup, enterprise, and big-tech environments — powered by your Digital Twin
          <Mic className="h-3.5 w-3.5 text-blue-500" aria-label="Voice-enabled meetings (PR-7)" />
        </p>
      </div>
      <div className="flex flex-col gap-6 p-6 lg:flex-row">
        <nav className="flex shrink-0 flex-row flex-wrap gap-1 lg:w-56 lg:flex-col">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/office" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
