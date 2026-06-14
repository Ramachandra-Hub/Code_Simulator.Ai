"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Play, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
];

const DEFAULT_CODE: Record<string, string> = {
  python: 'def solution():\n    # Write your code here\n    pass\n\nprint(solution())',
  javascript: 'function solution() {\n  // Write your code here\n}\n\nconsole.log(solution());',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
  csharp: 'using System;\n\nclass Solution {\n    static void Main() {\n        // Write your code here\n    }\n}',
};

interface MonacoEditorPanelProps {
  sessionId?: string;
  /** When set, uses /api/coding/sessions/{id}/run|submit instead of standalone lab APIs */
  codingSessionId?: string;
  onSubmit?: (result: Record<string, unknown>) => void;
}

export function MonacoEditorPanel({ sessionId, codingSessionId, onSubmit }: MonacoEditorPanelProps) {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] || "");
    setOutput("");
  };

  const runCode = async () => {
    setRunning(true);
    setOutput("Running...");
    try {
      const runUrl = codingSessionId ? `/coding/sessions/${codingSessionId}/run` : "/coding/run";
      const result = await apiFetch<{ stdout: string | null; stderr: string | null; status?: { description: string }; verdict?: string }>(
        runUrl,
        { method: "POST", body: JSON.stringify({ code, language }) }
      );
      setOutput(result.stdout || result.stderr || result.verdict || result.status?.description || "");
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Execution failed");
    }
    setRunning(false);
  };

  const submitCode = async () => {
    setRunning(true);
    try {
      const submitUrl = codingSessionId ? `/coding/sessions/${codingSessionId}/submit` : "/coding/submit";
      const result = await apiFetch<Record<string, unknown>>(submitUrl, {
        method: "POST",
        body: JSON.stringify({ code, language, sessionId }),
      });
      const eval_ = result.evaluation as { verdict?: string; overallScore?: number } | undefined;
      setOutput(`Verdict: ${eval_?.verdict || result.verdict || "Submitted"}\nScore: ${eval_?.overallScore ?? "—"}\n${result.stdout || ""}`);
      onSubmit?.(result);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Submit failed");
    }
    setRunning(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Coding Workspace</CardTitle>
        <select
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl overflow-hidden border border-border">
          <MonacoEditor
            height="300px"
            language={language === "csharp" ? "csharp" : language}
            value={code}
            onChange={(v) => setCode(v || "")}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 12 } }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runCode} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run
          </Button>
          <Button onClick={submitCode} disabled={running} variant="gradient">
            <Send className="mr-2 h-4 w-4" /> Submit
          </Button>
        </div>
        {output && (
          <pre className="rounded-xl bg-muted/50 p-4 text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {output}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
