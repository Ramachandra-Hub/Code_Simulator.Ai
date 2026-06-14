"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getSystemStatus } from "@/lib/beta-client";

const CACHE_KEY = "nexusedge_system_status";
const CACHE_MS = 5 * 60 * 1000;

export function SystemStatusBanner() {
  const [issues, setIssues] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as { at: number; issues: string[] };
          if (Date.now() - cached.at < CACHE_MS) {
            setIssues(cached.issues);
            return;
          }
        }
      } catch {
        // ignore cache read errors
      }

      getSystemStatus()
      .then((data) => {
        if (data.status === "ok") {
          setIssues([]);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), issues: [] }));
          } catch {
            // ignore
          }
          return;
        }
        const msgs: string[] = [];
        const s = data.services;
        if (s.database?.status !== "connected") msgs.push(s.database?.message || "Database unavailable");
        if (s.ollama?.status === "offline") msgs.push(s.ollama.message);
        if (s.judge0?.status === "required_offline") msgs.push(s.judge0.message);
        setIssues(msgs);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), issues: msgs }));
        } catch {
          // ignore cache write errors
        }
      })
      .catch(() => {});
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  if (dismissed || issues.length === 0) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-start gap-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-amber-800 dark:text-amber-200">Some services need attention</p>
        {issues.map((m) => (
          <p key={m} className="text-amber-700/90 dark:text-amber-300/90 text-xs">{m}</p>
        ))}
      </div>
      <button type="button" onClick={() => setDismissed(true)} className="text-amber-700 hover:text-amber-900">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
