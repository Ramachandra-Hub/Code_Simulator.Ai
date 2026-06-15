import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import {
  extractTextFromBuffer,
  parseResumeFromText,
  parsedToResumePayload,
} from "@/server/career-intelligence/services/resume-upload-parser";
import { saveResume, analyzeResume } from "@/server/career-intelligence/services/resume-service";
import { updateChecklistItem } from "@/server/beta/onboarding-service";
import "@/server/init";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromBuffer(buffer, file.name);
    const parsed = await parseResumeFromText(rawText, user.id);
    const payload = parsedToResumePayload(parsed);

    const resume = await saveResume(user.id, payload);
    const analysis = await analyzeResume(user.id, { ...payload }, resume.id);
    void updateChecklistItem(user.id, "resume");

    return NextResponse.json({
      resume,
      analysis,
      extractedChars: rawText.length,
      fileName: file.name,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
