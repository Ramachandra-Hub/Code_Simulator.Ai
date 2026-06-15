"use client";

export function OfficeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <div className="border-b border-border/60 bg-gradient-to-r from-slate-800/20 via-blue-600/10 to-indigo-500/10 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400">Workplace AI</p>
        <h1 className="text-2xl font-bold">Virtual Company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasks, standups, meetings, reviews, and promotion readiness — twin-grounded simulation
        </p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
