import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "oauth-state-dev-secret"
);

export async function createOAuthState(userId: string, provider: string): Promise<string> {
  return new SignJWT({ userId, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyOAuthState(state: string): Promise<{ userId: string; provider: string }> {
  const { payload } = await jwtVerify(state, secret);
  const userId = payload.userId as string;
  const provider = payload.provider as string;
  if (!userId || !provider) throw new Error("Invalid OAuth state");
  return { userId, provider };
}
