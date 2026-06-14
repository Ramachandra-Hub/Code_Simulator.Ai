"use client";

import { useEffect, useState } from "react";
import { getDefaultProfile, getProfile } from "@/lib/profile";
import { fetchSession, getStoredSession } from "@/lib/auth-client";
import type { User, UserRole } from "@/lib/types";

function userFromSession(session: { id: string; email: string; name: string; role: UserRole }): User {
  const profile = getProfile(session.role);
  const initials = session.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    avatar: initials || "U",
    institution: profile.institution,
    department: profile.department,
  };
}

export function useCurrentUser() {
  const [role, setRole] = useState<UserRole>("student");
  const [user, setUser] = useState<User>(() => {
    const defaults = getDefaultProfile("student");
    return { id: "", name: defaults.name, email: defaults.email, role: "student", avatar: "U" };
  });
  const [mounted, setMounted] = useState(false);

  const refresh = () => {
    const session = getStoredSession();
    if (session) {
      setRole(session.role);
      setUser(userFromSession(session));
    }
  };

  useEffect(() => {
    refresh();
    setMounted(true);

    fetchSession().then((s) => {
      if (s) {
        setRole(s.role);
        setUser(userFromSession(s));
      }
    });

    const onProfileUpdate = () => refresh();
    window.addEventListener("nexusedge-profile-updated", onProfileUpdate);
    return () => window.removeEventListener("nexusedge-profile-updated", onProfileUpdate);
  }, []);

  return { user, role, mounted, refresh };
}
