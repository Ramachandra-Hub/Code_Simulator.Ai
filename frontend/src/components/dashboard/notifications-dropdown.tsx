"use client";

import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { notifications as initialNotifications } from "@/lib/mock-data";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function NotificationsDropdown() {
  const [items, setItems] = useState(initialNotifications);
  const { toast } = useToast();
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({ title: "All notifications marked as read", variant: "success" });
  };

  const openNotification = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const n = items.find((i) => i.id === id);
    if (n) toast({ title: n.title, description: n.message });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-normal"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="flex flex-col items-start gap-1 cursor-pointer py-3"
            onClick={() => openNotification(n.id)}
          >
            <div className="flex items-center gap-2 w-full">
              <span className="text-sm font-medium flex-1">{n.title}</span>
              {!n.read && <Badge variant="info" className="text-[10px]">New</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">{n.message}</span>
            <span className="text-[10px] text-muted-foreground">{n.time}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
