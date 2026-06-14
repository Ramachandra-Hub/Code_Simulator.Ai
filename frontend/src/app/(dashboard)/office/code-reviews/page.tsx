"use client";

import { useEffect, useState } from "react";
import { officeApi } from "@/lib/office-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Review = {
  id: string;
  score: number;
  feedback?: string;
  questions?: string[];
  reviewerAgent: string;
  createdAt: string;
};

const SAMPLE = `export async function getUser(id: string) {
  try {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new Error("Not found");
    return user;
  } catch (err) {
    logger.error("getUser failed", err);
    throw err;
  }
}`;

export default function OfficeCodeReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [code, setCode] = useState(SAMPLE);
  const [submitting, setSubmitting] = useState(false);

  const load = () => officeApi.codeReviews().then((d) => setReviews((d.codeReviews as Review[]) || []));

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      await officeApi.submitCodeReview({ code, language: "typescript" });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        SeniorEngineerAgent reviews your code — design, scale, and failure scenarios
      </p>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Submit for Review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={code} onChange={(e) => setCode(e.target.value)} rows={12} className="font-mono text-sm" />
          <Button onClick={submit} disabled={submitting}>Request review</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {reviews.map((r) => (
          <Card key={r.id} className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Score: {r.score}/100 — {r.reviewerAgent}</CardTitle>
              <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
            </CardHeader>
            <CardContent>
              {r.questions && (
                <ul className="mb-2 list-inside list-disc text-sm">
                  {(r.questions as string[]).map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              )}
              <p className="text-sm text-muted-foreground">{r.feedback}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
