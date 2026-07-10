import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { User } from "@/server/models/User";
import { verifyPassword } from "@/server/password";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/server/auth";
import { parseBody, passwordLoginSchema } from "@/server/validation";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, passwordLoginSchema);
    if (!parsed.ok) return parsed.response;
    const { email, password } = parsed.data;

    await db();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "This account has no password set — please register again with a password",
        },
        { status: 400 }
      );
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const token = await signSession({
      userId: String(user._id),
      orgId: String(user.orgId),
      email,
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
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Could not reach the database — please try again in a moment" },
      { status: 500 }
    );
  }
}
