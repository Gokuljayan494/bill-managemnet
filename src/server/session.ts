import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE, Session } from "@/server/auth";

/** Read and verify the session cookie inside a route handler. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}
