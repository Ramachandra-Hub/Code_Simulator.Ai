import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/server/lib/oauth-state";
import { integrationCallbackUrl, getAppBaseUrl } from "@/server/lib/oauth-redirect";
import { githubClient } from "@/server/career-intelligence/integrations/github-client";
import { upsertIntegrationAccount, syncGitHub } from "@/server/career-intelligence/services/profile-integration-service";
import "@/server/init";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const dashboard = `${getAppBaseUrl()}/dashboard/professional-intelligence`;

  if (!code || !state) {
    return NextResponse.redirect(`${dashboard}?error=oauth_missing_params`);
  }

  try {
    const { userId, provider } = await verifyOAuthState(state);
    if (provider !== "github") throw new Error("Invalid provider");

    const redirectUri = integrationCallbackUrl("github");
    const { accessToken, username } = await githubClient.exchangeCode(code, redirectUri);

    await upsertIntegrationAccount(userId, "github", {
      accessToken,
      metadata: { username },
    });

    if (username) await syncGitHub(userId, username);

    return NextResponse.redirect(`${dashboard}?connected=github`);
  } catch (err) {
    const msg = encodeURIComponent(err instanceof Error ? err.message : "oauth_failed");
    return NextResponse.redirect(`${dashboard}?error=${msg}`);
  }
}
