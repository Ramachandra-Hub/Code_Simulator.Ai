"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordPageLoad } from "@/lib/beta-client";

export function PageLoadTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    const report = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const loadMs = nav
        ? Math.round(nav.loadEventEnd - nav.startTime)
        : Math.round(performance.now());
      if (loadMs > 0 && loadMs < 120000) {
        void recordPageLoad(pathname, loadMs);
      }
    };

    if (document.readyState === "complete") {
      report();
    } else {
      window.addEventListener("load", report, { once: true });
      return () => window.removeEventListener("load", report);
    }
  }, [pathname]);

  return null;
}
