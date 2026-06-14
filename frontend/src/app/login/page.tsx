"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { APP_NAME, ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import { loginAsDemo, loginWithCredentials } from "@/lib/auth-client";
import type { UserRole } from "@/lib/types";

const demoRoles: { role: UserRole; label: string }[] = [
  { role: "student", label: "Student" },
  { role: "faculty", label: "Faculty" },
  { role: "college_admin", label: "College Admin" },
  { role: "placement_officer", label: "Placement Officer" },
  { role: "training_coordinator", label: "Training Coordinator" },
  { role: "recruiter", label: "Recruiter" },
  { role: "super_admin", label: "Super Admin" },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("arjun@nexusedge.edu");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("demo") === "true") {
      handleDemoLogin("student");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishLogin = (role: UserRole) => {
    toast({ title: "Welcome back!", variant: "success" });
    router.push(ROLE_DASHBOARD_PATHS[role]);
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("credentials");
    try {
      const session = await loginWithCredentials(email, password);
      finishLogin(session.role);
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "error",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setLoading(role);
    try {
      const session = await loginAsDemo(role);
      finishLogin(session.role);
    } catch (err) {
      toast({
        title: "Demo login failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "error",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 lg:flex">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-lg p-12 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-tight">Welcome to {APP_NAME}</h1>
          <p className="mt-4 text-lg text-white/80">
            Your AI-powered career ecosystem. Learn, code, prepare, and get placed — all in one premium platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["AI Coaching", "Coding Lab", "Mock Interviews", "Placements"].map((tag) => (
              <Badge key={tag} className="bg-white/20 text-white border-0 backdrop-blur-sm">{tag}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8 mesh-bg">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">{APP_NAME}</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-2 text-muted-foreground">Enter your credentials or choose a demo role</p>

          <form className="mt-8 space-y-4" onSubmit={handleCredentialsLogin}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@university.edu" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading !== null}>
              {loading === "credentials" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or try demo as</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoRoles.map((item) => (
              <Button
                key={item.role}
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin(item.role)}
                disabled={loading !== null}
                className="justify-start"
              >
                {loading === item.role ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {item.label}
              </Button>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href="mailto:support@nexusedge.ai" className="text-primary hover:underline">
              Contact your institution
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
