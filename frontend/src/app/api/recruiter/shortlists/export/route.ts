import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { listShortlists } from "@/server/talent/services/talent-intelligence-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shortlists = await listShortlists(user.id);
  const csv = [
    "Name,Email,Status,Job,Notes,Updated",
    ...shortlists.map(
      (s) =>
        `"${s.candidate.name}","${s.candidate.email}","${s.status}","${s.job?.title || ""}","${(s.notes || "").replace(/"/g, '""')}","${s.updatedAt.toISOString()}"`
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="shortlist-export.csv"',
    },
  });
}
