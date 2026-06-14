"use client";

import dynamic from "next/dynamic";

interface ActivityChartProps {
  data: Array<Record<string, string | number>>;
  type?: "area" | "bar";
  dataKeys?: string[];
  colors?: string[];
  height?: number;
}

const ChartInner = dynamic(() => import("./activity-chart-inner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground"
      style={{ height: 280 }}
    >
      Loading chart...
    </div>
  ),
});

export function ActivityChart(props: ActivityChartProps) {
  return <ChartInner {...props} />;
}
