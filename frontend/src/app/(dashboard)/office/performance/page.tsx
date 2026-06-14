"use client";

import { useEffect, useState } from "react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Review = {
  period: string;
  technical: number;
  communication: number;
  ownership: number;
  leadership: number;
  collaboration: number;
  promotionReady: number;
  summary?: string;
  createdAt: string;
};

export default function OfficePerformancePage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => officeApi.performance().then((d) => setReviews((d.reviews as Review[]) || []));

  useEffect(() => { load(); }, []);

  const run = async (period: "weekly" | "monthly") => {
    setLoading(true);
    try {
      await officeApi.runPerformanceReview(period);
      load();
    } finally {
      setLoading(false);
    }
  };

  const dims = (r: Review) => [
    { label: "Technical", value: r.technical },
    { label: "Communication", value: r.communication },
    { label: "Ownership", value: r.ownership },
    { label: "Leadership", value: r.leadership },
    { label: "Collaboration", value: r.collaboration },
    { label: "Promotion Ready", value: r.promotionReady },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run("weekly")} disabled={loading}>Run weekly review</Button>
        <Button variant="outline" onClick={() => run("monthly")} disabled={loading}>Run monthly review</Button>
      </div>

      <div className="grid gap-4">
        {reviews.map((r, i) => (
          <Card key={i} className="glass-card">
            <CardHeader>
              <CardTitle className="text-base capitalize">{r.period} review</CardTitle>
              <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {dims(r).map((d) => (
                <div key={d.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{d.label}</span>
                    <span>{d.value}</span>
                  </div>
                  <Progress value={d.value} />
                </div>
              ))}
              {r.summary && <p className="text-sm text-muted-foreground">{r.summary}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
