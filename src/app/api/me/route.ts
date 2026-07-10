import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { User } from "@/server/models/User";
import { Organization } from "@/server/models/Organization";
import { getSession, unauthorized } from "@/server/session";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const [user, org] = await Promise.all([
    User.findById(session.userId).lean(),
    Organization.findById(session.orgId).lean(),
  ]);

  return NextResponse.json({
    email: session.email,
    name: user?.name ?? "",
    role: session.role,
    org: { name: org?.name ?? "My business" },
  });
}
