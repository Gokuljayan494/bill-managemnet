import { createHash } from "crypto";
import { Otp } from "@/server/models/Otp";

/** Check and consume a one-time code. Deletes it on success. */
export async function consumeOtp(
  email: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const otp = await Otp.findOne({ email });
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Code expired — request a new one", status: 400 };
  }
  if (otp.attempts >= 5) {
    await Otp.deleteOne({ _id: otp._id });
    return {
      ok: false,
      error: "Too many attempts — request a new code",
      status: 429,
    };
  }
  const codeHash = createHash("sha256").update(code).digest("hex");
  if (codeHash !== otp.codeHash) {
    await Otp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    return { ok: false, error: "Incorrect code", status: 400 };
  }
  await Otp.deleteOne({ _id: otp._id });
  return { ok: true };
}
