"use client";

import { useCallback, useState } from "react";
import { ToastContext, useToast, type Toast } from "@/hooks/use-toast";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4 shadow-glass-lg backdrop-blur-xl animate-in slide-in-from-right",
            t.variant === "success" && "border-emerald-500/30 bg-emerald-500/10",
            t.variant === "error" && "border-rose-500/30 bg-rose-500/10",
            (!t.variant || t.variant === "default") && "border-border bg-card"
          )}
        >
          {t.variant === "success" && (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          )}
          {t.variant === "error" && (
            <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}
