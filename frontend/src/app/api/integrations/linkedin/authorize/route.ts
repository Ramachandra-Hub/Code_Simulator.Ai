import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { createOAuthState } from "@/server/lib/oauth-state";
import { linkedinClient } from "@/server/career-intelligence/integrations/linkedin-client";
import { integrationCallbackUrl } from "@/server/lib/oauth-redirect";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.LINKEDIN_CLIENT_ID) {
    return NextResponse.json({ error: "LinkedIn OAuth not configured" }, { status: 503 });
  }

  const state = await createOAuthState(user.id, "linkedin");
  const url = linkedinClient.getAuthorizeUrl(integrationCallbackUrl("linkedin"), state);
  return NextResponse.redirect(url);
}
