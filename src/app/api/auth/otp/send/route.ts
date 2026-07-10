import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { db } from "@/server/db";
import { Otp } from "@/server/models/Otp";
import { otpSendSchema, parseBody } from "@/server/validation";

const OTP_TTL_MS = 5 * 60 * 1000;

async function sendEmail(to: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Reverse Store <onboarding@resend.dev>",
      to: [to],
      subject: `${code} is your Reverse Store verification code`,
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto">
        <h2 style="color:#0e7553">Reverse Store</h2>
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
        <p style="color:#64748b;font-size:13px">This code expires in 5 minutes. If you didn't request it, ignore this email.</p>
      </div>`,
    }),
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, otpSendSchema);
  if (!parsed.ok) return parsed.response;
  const normalized = parsed.data.email;

  await db();

  // Light rate limit: block re-send within 30s of the previous code
  const existing = await Otp.findOne({ email: normalized });
  if (existing && Date.now() - existing.createdAt.getTime() < 30_000) {
    return NextResponse.json(
      { error: "Please wait a moment before requesting another code" },
      { status: 429 }
    );
  }

  const code = String(randomInt(100000, 1000000));
  const codeHash = createHash("sha256").update(code).digest("hex");

  await Otp.findOneAndUpdate(
    { email: normalized },
    {
      codeHash,
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true }
  );

  const emailed = await sendEmail(normalized, code);

  if (!emailed) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      );
    }
    // Dev without RESEND_API_KEY: expose the code so the flow is testable
    console.log(`[auth] OTP for ${normalized}: ${code}`);
    return NextResponse.json({ ok: true, devCode: code });
  }

  return NextResponse.json({ ok: true });
}
