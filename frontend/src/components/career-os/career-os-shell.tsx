"use client";

import { usePathname } from "next/navigation";

export function CareerOSShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub = pathname === "/career-os";

  return (
    <div className="min-h-full">
      <div className="border-b border-border/60 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-emerald-500/10 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">Career</p>
        <h1 className="text-2xl font-bold">Career Operating System</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resume, ATS, coach, twin, and reports — one workspace powered by your Digital Twin
        </p>
      </div>
      <div className="p-6">{isHub ? children : <div className="min-w-0">{children}</div>}</div>
    </div>
  );
}
