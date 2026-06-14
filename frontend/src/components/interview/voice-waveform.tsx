"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  active: boolean;
  level?: number;
  className?: string;
}

export function VoiceWaveform({ active, level = 0, className }: VoiceWaveformProps) {
  const bars = 24;
  const heights = useRef<number[]>(Array(bars).fill(0.15));

  useEffect(() => {
    if (!active) {
      heights.current = Array(bars).fill(0.12);
      return;
    }
    const id = setInterval(() => {
      heights.current = heights.current.map((_, i) => {
        const base = 0.15 + level * 0.85;
        const jitter = Math.random() * 0.35;
        const wave = Math.sin(Date.now() / 120 + i * 0.5) * 0.15;
        return Math.min(1, Math.max(0.1, base + jitter + wave));
      });
    }, 80);
    return () => clearInterval(id);
  }, [active, level]);

  return (
    <div className={cn("flex items-end justify-center gap-0.5 h-12", className)}>
      {heights.current.map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-75",
            active ? "bg-primary" : "bg-muted-foreground/30"
          )}
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}
