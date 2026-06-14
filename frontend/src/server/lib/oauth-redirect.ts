export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export function integrationCallbackUrl(provider: "github" | "linkedin"): string {
  return `${getAppBaseUrl()}/api/integrations/${provider}/callback`;
}
