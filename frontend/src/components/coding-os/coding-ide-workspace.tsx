"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Play, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { codingOsApi } from "@/lib/coding-os-client";
import { CODING_OS_LANGUAGES } from "@/lib/coding-os-languages";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type ProblemDetail = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints?: string;
  examples: { input: string; output: string }[];
  starterCode: Record<string, string>;
  hints: { content: string }[];
  testCases: { input: string; expectedOutput: string }[];
};

export function CodingIDEWorkspace({ problemId }: { problemId: string }) {
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [consoleOut, setConsoleOut] = useState("");
  const [caseResults, setCaseResults] = useState<unknown[]>([]);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [running, setRunning] = useState(false);
  const [mentorMsg, setMentorMsg] = useState("");
  const [mentorReply, setMentorReply] = useState("");

  const load = useCallback(async () => {
    const res = await codingOsApi.problem(problemId);
    const p = res.problem as ProblemDetail;
    setProblem(p);
    setCode(p.starterCode?.python || "");
    if (p.testCases?.[0]) setStdin(p.testCases[0].input);
  }, [problemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onLang = (lang: string) => {
    setLanguage(lang);
    if (problem?.starterCode?.[lang]) setCode(problem.starterCode[lang]);
  };

  const run = async () => {
    setRunning(true);
    setConsoleOut("Running…");
    try {
      const res = await codingOsApi.run(problemId, { code, language, stdin });
      setConsoleOut([res.stdout, res.stderr].filter(Boolean).join("\n") || String(res.verdict));
    } catch (e) {
      setConsoleOut(e instanceof Error ? e.message : "Run failed");
    }
    setRunning(false);
  };

  const submit = async () => {
    setRunning(true);
    try {
      const res = await codingOsApi.submit(problemId, { code, language });
      setCaseResults((res.caseResults as unknown[]) || []);
      setReview((res.review as Record<string, unknown>) || null);
      setConsoleOut(`Verdict: ${res.verdict}\nPassed ${res.passedCases}/${res.totalCases}`);
    } catch (e) {
      setConsoleOut(e instanceof Error ? e.message : "Submit failed");
    }
    setRunning(false);
  };

  const askMentor = async () => {
    const res = await codingOsApi.mentor({ message: mentorMsg, problemId });
    setMentorReply(String(res.reply || ""));
  };

  if (!problem) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const monacoLang = CODING_OS_LANGUAGES.find((l) => l.id === language)?.monaco || "python";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-2">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/coding-os?tab=practice">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <h2 className="font-semibold">{problem.title}</h2>
        <Badge variant="outline">{problem.difficulty}</Badge>
      </div>

      <div className="grid flex-1 min-h-0 gap-2 lg:grid-cols-12 lg:grid-rows-[1fr_auto]">
        {/* Left — problem */}
        <Card className="glass-card lg:col-span-3 overflow-hidden flex flex-col min-h-[200px] lg:min-h-0">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm">Problem</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto text-sm space-y-3 flex-1">
            <div className="whitespace-pre-wrap">{problem.description}</div>
            {problem.constraints && (
              <p className="text-xs text-muted-foreground">Constraints: {problem.constraints}</p>
            )}
            {problem.examples?.map((ex, i) => (
              <div key={i} className="rounded bg-muted/50 p-2 text-xs font-mono">
                <p>Input: {ex.input}</p>
                <p>Output: {ex.output}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Center — editor */}
        <div className="lg:col-span-6 flex flex-col min-h-[280px] lg:min-h-0 border rounded-xl overflow-hidden bg-[#1e1e1e]">
          <div className="flex flex-wrap gap-1 p-2 bg-muted/30 border-b">
            {CODING_OS_LANGUAGES.filter((l) => problem.starterCode?.[l.id] || l.id === "python").map((l) => (
              <Button key={l.id} size="sm" variant={language === l.id ? "default" : "ghost"} onClick={() => onLang(l.id)}>
                {l.label}
              </Button>
            ))}
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="outline" onClick={() => void run()} disabled={running}>
                <Play className="mr-1 h-3 w-3" /> Run
              </Button>
              <Button size="sm" onClick={() => void submit()} disabled={running}>
                <Send className="mr-1 h-3 w-3" /> Submit
              </Button>
            </div>
          </div>
          <MonacoEditor height="100%" language={monacoLang} theme="vs-dark" value={code} onChange={(v) => setCode(v || "")} />
        </div>

        {/* Right — AI mentor */}
        <Card className="glass-card lg:col-span-3 flex flex-col min-h-[200px] lg:min-h-0">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm flex items-center gap-1">
              <Bot className="h-4 w-4" /> AI Mentor
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 flex-1 min-h-0">
            <textarea
              className="w-full flex-1 min-h-[80px] rounded border bg-background p-2 text-xs resize-none"
              placeholder="Explain approach or complexity…"
              value={mentorMsg}
              onChange={(e) => setMentorMsg(e.target.value)}
            />
            <Button size="sm" onClick={() => void askMentor()}>
              Ask
            </Button>
            {mentorReply && <p className="text-xs whitespace-pre-wrap overflow-y-auto flex-1">{mentorReply}</p>}
          </CardContent>
        </Card>

        {/* Bottom — console */}
        <Card className="glass-card lg:col-span-12">
          <Tabs defaultValue="console">
            <CardHeader className="py-2">
              <TabsList className="h-8">
                <TabsTrigger value="console" className="text-xs">
                  Console
                </TabsTrigger>
                <TabsTrigger value="cases" className="text-xs">
                  Test Cases
                </TabsTrigger>
                <TabsTrigger value="review" className="text-xs">
                  AI Review
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-0">
              <TabsContent value="console" className="mt-0">
                <div className="mb-2">
                  <label className="text-xs text-muted-foreground">Custom input</label>
                  <textarea
                    className="w-full h-16 rounded border bg-muted/30 p-2 font-mono text-xs"
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                  />
                </div>
                <pre className="min-h-[80px] max-h-40 overflow-auto rounded bg-black/90 p-3 text-xs text-green-400 font-mono">
                  {consoleOut || "Output appears here"}
                </pre>
              </TabsContent>
              <TabsContent value="cases" className="mt-0">
                <div className="space-y-1 text-xs font-mono max-h-40 overflow-auto">
                  {(caseResults as Array<{ passed: boolean; input: string; expected: string; actual: string }>).map((c, i) => (
                    <div key={i} className={c.passed ? "text-emerald-600" : "text-red-500"}>
                      Case {i + 1}: {c.passed ? "PASS" : "FAIL"} — expected {c.expected}, got {c.actual}
                    </div>
                  ))}
                  {!caseResults.length && <p className="text-muted-foreground">Submit to evaluate test cases</p>}
                </div>
              </TabsContent>
              <TabsContent value="review" className="mt-0 text-sm">
                {review ? (
                  <div>
                    <p>{String(review.summary)}</p>
                    <ul className="list-disc pl-4 mt-2 text-xs">
                      {((review.suggestions as string[]) || []).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">AI code review appears after submit (does not affect score)</p>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
