import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import {
  generateInterviewReportPdf,
  getStoredInterviewPdf,
} from "@/server/career-intelligence/services/interview-pdf-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import "@/server/init";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const regenerate = url.searchParams.get("regenerate") === "true";

  try {
    let buffer: Buffer;
    let filename: string;

    if (!regenerate) {
      const stored = await getStoredInterviewPdf(id, user.id);
      if (stored) {
        return new NextResponse(new Uint8Array(stored.content), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${stored.filename}"`,
            "Content-Length": String(stored.size),
          },
        });
      }
    }

    const generated = await generateInterviewReportPdf(id, user.id);
    buffer = generated.buffer;
    filename = generated.filename;
    await trackUsageEvent(ANALYTICS_EVENTS.PDF_DOWNLOADED, user.id, { sessionId: id });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "PDF generation failed" }, { status: 500 });
  }
}
