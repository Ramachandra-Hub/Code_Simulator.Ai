"use client";

import Link from "next/link";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TwinActivityItem {
  id: string;
  label: string;
  trigger: string;
  at: string;
  summary?: string;
}

export function TwinActivityFeed({
  activity,
  readinessDelta,
}: {
  activity: TwinActivityItem[];
  readinessDelta?: { current: number; previous: number | null; delta: number; trend: "up" | "down" | "flat" };
}) {
  if (!activity.length && !readinessDelta) {
    return (
      <p className="text-sm text-muted-foreground">
        Complete a mock interview, upload your resume, or solve coding problems to build your Digital Twin.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {readinessDelta && (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
          {readinessDelta.trend === "up" ? (
            <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : readinessDelta.trend === "down" ? (
            <TrendingDown className="h-5 w-5 text-rose-500 shrink-0" />
          ) : (
            <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium">
              Placement readiness: {readinessDelta.current}%
              {readinessDelta.delta !== 0 && (
                <Badge variant={readinessDelta.trend === "up" ? "success" : "destructive"} className="ml-2 text-[10px]">
                  {readinessDelta.delta > 0 ? "+" : ""}
                  {readinessDelta.delta}
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Your twin updates after every real action</p>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {activity.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-2 text-sm border-b border-border/40 pb-2 last:border-0">
            <div>
              <p className="font-medium">{a.label}</p>
              {a.summary && <p className="text-xs text-muted-foreground">{a.summary}</p>}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {new Date(a.at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NextActionsList({ actions }: { actions: Array<{ title: string; href: string; priority: string }> }) {
  if (!actions.length) return null;
  return (
    <ul className="space-y-2">
      {actions.map((a) => (
        <li key={a.href}>
          <Link
            href={a.href}
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <span>{a.title}</span>
            <Badge variant={a.priority === "high" ? "default" : "outline"} className="text-[10px]">
              {a.priority}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
