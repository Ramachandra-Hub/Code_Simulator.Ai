import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { createOAuthState } from "@/server/lib/oauth-state";
import { integrationCallbackUrl } from "@/server/lib/oauth-redirect";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 503 });
  }

  const state = await createOAuthState(user.id, "github");
  const redirectUri = integrationCallbackUrl("github");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user repo",
    state,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
