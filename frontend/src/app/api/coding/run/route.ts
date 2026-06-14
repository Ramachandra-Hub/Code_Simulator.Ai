import { NextResponse } from "next/server";
import { runCodeExecution } from "@/server/career-intelligence/workflows/coding-interview-graph";
import "@/server/init";

export async function POST(req: Request) {
  try {
    const { code, language, stdin } = await req.json();
    const result = await runCodeExecution(code, language, stdin);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Run failed" }, { status: 500 });
  }
}
