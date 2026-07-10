import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { User } from "@/server/models/User";
import { Organization } from "@/server/models/Organization";
import { hashPassword } from "@/server/password";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/server/auth";
import { parseBody, registerSchema } from "@/server/validation";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, registerSchema);
    if (!parsed.ok) return parsed.response;
    const { name, businessName, email, phone, password } = parsed.data;

    await db();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists — sign in instead" },
        { status: 409 }
      );
    }

    const slugBase = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);
    const org = await Organization.create({
      name: businessName,
      slug: `${slugBase || "store"}-${Date.now().toString(36)}`,
      settings: { email },
    });

    const user = await User.create({
      orgId: org._id,
      email,
      name,
      phone,
      passwordHash: hashPassword(password),
      role: "owner",
      lastLoginAt: new Date(),
    });

    const token = await signSession({
      userId: String(user._id),
      orgId: String(org._id),
      email,
      role: "owner",
    });

    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json(
      { error: "Could not reach the database — please try again in a moment" },
      { status: 500 }
    );
  }
}
