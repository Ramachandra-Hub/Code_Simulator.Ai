"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields?: { id: string; label: string; placeholder?: string; type?: string; multiline?: boolean }[];
  submitLabel?: string;
  onSubmit?: (data: Record<string, string>) => void;
}

export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  fields = [],
  submitLabel = "Submit",
  onSubmit,
}: ActionDialogProps) {
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onSubmit?.(data);
    toast({ title: `${title} completed`, variant: "success" });
    onOpenChange(false);
    setData({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2">
          {fields.map((f) => (
            <div key={f.id} className="space-y-2">
              <Label htmlFor={f.id}>{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  id={f.id}
                  placeholder={f.placeholder}
                  value={data[f.id] ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, [f.id]: e.target.value }))}
                />
              ) : (
                <Input
                  id={f.id}
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={data[f.id] ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, [f.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
