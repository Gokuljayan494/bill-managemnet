import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bf_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-secret-change-in-production"
);

export interface Session {
  userId: string;
  orgId: string;
  email: string;
  role: "owner" | "staff";
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.userId || !payload.orgId) return null;
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
