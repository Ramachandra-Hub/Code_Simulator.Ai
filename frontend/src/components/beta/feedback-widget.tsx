"use client";

import { useState } from "react";
import { MessageSquarePlus, Star, Bug, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FEEDBACK_TYPES, submitFeedback } from "@/lib/beta-client";
import { cn } from "@/lib/utils";

type FeedbackMode = "report_issue" | "suggest_improvement" | null;

export function FeedbackWidget() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FeedbackMode>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!mode || message.trim().length < 5) {
      toast({ title: "Please add more detail", variant: "error" });
      return;
    }
    setSending(true);
    try {
      await submitFeedback({ type: mode, message: message.trim(), context: { page: window.location.pathname } });
      toast({ title: "Thank you!", description: "Your feedback helps us improve NexusEdge.", variant: "success" });
      setMessage("");
      setMode(null);
      setOpen(false);
    } catch (err) {
      toast({ title: "Could not send", description: err instanceof Error ? err.message : "Try again", variant: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 left-4 z-50 shadow-lg gap-2">
          <MessageSquarePlus className="h-4 w-4" /> Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === FEEDBACK_TYPES.REPORT_ISSUE ? "default" : "outline"}
            className="h-auto py-3 flex-col gap-1"
            onClick={() => setMode(FEEDBACK_TYPES.REPORT_ISSUE)}
          >
            <Bug className="h-4 w-4" /> Report Issue
          </Button>
          <Button
            variant={mode === FEEDBACK_TYPES.SUGGEST_IMPROVEMENT ? "default" : "outline"}
            className="h-auto py-3 flex-col gap-1"
            onClick={() => setMode(FEEDBACK_TYPES.SUGGEST_IMPROVEMENT)}
          >
            <Lightbulb className="h-4 w-4" /> Suggest Improvement
          </Button>
        </div>
        {mode && (
          <div className="space-y-2 mt-4">
            <Label>Details</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened? What would you like improved?"
              className="min-h-[100px]"
            />
            <Button onClick={send} disabled={sending} className="w-full">
              {sending ? "Sending..." : "Submit Feedback"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RatingFeedback({
  type,
  title,
  context,
}: {
  type: "rate_interview" | "rate_career_coach";
  title: string;
  context?: Record<string, unknown>;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (stars: number) => {
    setRating(stars);
    try {
      await submitFeedback({
        type,
        rating: stars,
        message: comment || undefined,
        context,
      });
      setSent(true);
      toast({ title: "Thanks for rating!", variant: "success" });
    } catch {
      toast({ title: "Rating failed", variant: "error" });
    }
  };

  if (sent) {
    return <p className="text-sm text-muted-foreground text-center py-4">Thanks for your {rating}-star rating!</p>;
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3 text-center">
      <p className="text-sm font-medium">{title}</p>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => submit(n)}
            className={cn("p-1 rounded hover:scale-110 transition-transform", rating >= n && "text-amber-500")}
          >
            <Star className={cn("h-6 w-6", rating >= n ? "fill-amber-500" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        className="min-h-[60px] text-sm"
      />
    </div>
  );
}
