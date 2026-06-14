"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Code2,
  FileText,
  Github,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  Linkedin,
  Mic,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatCard as StatCardType } from "@/lib/types";

const iconMap: Record<string, LucideIcon> = {
  Target,
  Code2,
  GraduationCap,
  Building2,
  FileText,
  Mic,
  Users,
  Briefcase,
  IndianRupee,
  TrendingUp,
  LayoutDashboard,
  Activity,
  Sparkles,
  Github,
  Linkedin,
  Shield,
  Trophy,
};

interface StatCardProps {
  stat: StatCardType;
  index?: number;
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = iconMap[stat.icon] || Target;
  const isPositive = (stat.change ?? 0) >= 0;

  return (
    <div className="group">
      <div className="glass-card stat-glow p-6 transition-all duration-300 hover:shadow-glass-lg hover:-translate-y-1">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
              stat.gradient
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          {stat.change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                isPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(stat.change)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{stat.title}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{stat.value}</p>
          {stat.changeLabel && (
            <p className="mt-1 text-xs text-muted-foreground">{stat.changeLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
