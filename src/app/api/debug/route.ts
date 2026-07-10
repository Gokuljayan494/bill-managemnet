import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { Otp } from "@/server/models/Otp";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  await db();
  const otps = await Otp.find({}).lean();
  return NextResponse.json({
    now: new Date().toISOString(),
    otps: otps.map((o) => ({
      email: o.email,
      expiresAt: o.expiresAt,
      attempts: o.attempts,
    })),
  });
}
