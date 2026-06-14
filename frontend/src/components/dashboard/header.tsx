"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Command } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/dashboard/user-menu";
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SEARCH_ROUTES } from "@/lib/routes";
import type { User } from "@/lib/types";

interface HeaderProps {
  user?: User;
  title?: string;
}

export function DashboardHeader({ user: userProp, title }: HeaderProps) {
  const router = useRouter();
  const { user: hookUser, mounted } = useCurrentUser();
  const user = mounted ? hookUser : userProp ?? hookUser;
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.toLowerCase().trim();
    if (!q) return;
    const match = SEARCH_ROUTES.find((r) =>
      r.keywords.some((k) => q.includes(k) || k.includes(q))
    );
    router.push(match?.href ?? `/learn?tab=courses&q=${encodeURIComponent(q)}`);
    setQuery("");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl">
      <div>
        {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="global-search"
            placeholder="Search anything..."
            className="w-64 pl-9 pr-12 glass"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </form>

        <ThemeToggle />
        <NotificationsDropdown />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
