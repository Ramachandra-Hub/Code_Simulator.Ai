"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Calendar,
  LayoutDashboard,
  LineChart,
  Rocket,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/career-os", label: "Overview", icon: LayoutDashboard },
  { href: "/career-os/missions", label: "Daily Missions", icon: Calendar },
  { href: "/career-os/goals", label: "Goals", icon: Target },
  { href: "/career-os/habits", label: "Habits", icon: Zap },
  { href: "/career-os/progress", label: "Progress", icon: LineChart },
  { href: "/career-os/forecast", label: "Placement Forecast", icon: TrendingUp },
  { href: "/career-os/potential", label: "Future Potential", icon: Rocket },
  { href: "/career-os/achievements", label: "Achievements", icon: Award },
];

export function CareerOSShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full">
      <div className="border-b border-border/60 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-emerald-500/10 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">CareerOS</p>
        <h1 className="text-2xl font-bold">AI Career Operating System</h1>
        <p className="mt-1 text-sm text-muted-foreground">What exactly should you do today? — powered by your Digital Twin</p>
      </div>
      <div className="flex flex-col gap-6 p-6 lg:flex-row">
        <nav className="flex shrink-0 flex-row flex-wrap gap-1 lg:w-52 lg:flex-col">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/career-os" && pathname.startsWith(item.href));
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
