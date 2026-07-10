import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { User } from "@/server/models/User";
import { Organization } from "@/server/models/Organization";
import { consumeOtp } from "@/server/otp";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/server/auth";
import { otpVerifySchema, parseBody } from "@/server/validation";

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, otpVerifySchema);
  if (!parsed.ok) return parsed.response;
  const { email: normalized, code: otpCode } = parsed.data;

  await db();

  const otpResult = await consumeOtp(normalized, otpCode);
  if (!otpResult.ok) {
    return NextResponse.json(
      { error: otpResult.error },
      { status: otpResult.status }
    );
  }

  // Find the user, or create a new organization + owner on first login
  let user = await User.findOne({ email: normalized });
  if (!user) {
    const prefix = normalized.split("@")[0].replace(/[^a-z0-9]/g, "");
    const slug = `${prefix}-${Date.now().toString(36)}`;
    const org = await Organization.create({
      name: `${prefix}'s business`,
      slug,
    });
    user = await User.create({
      orgId: org._id,
      email: normalized,
      role: "owner",
    });
  }
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  const token = await signSession({
    userId: String(user._id),
    orgId: String(user.orgId),
    email: normalized,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
