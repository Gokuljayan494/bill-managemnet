"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Method = "password" | "otp";
type Step = "identify" | "otp";

export function LoginForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [step, setStep] = useState<Step>("identify");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const loginWithPassword = async () => {
    if (busy) return;
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — check your connection");
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send the code — try again");
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      setStep("otp");
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        setOtp(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — check your connection");
    } finally {
      setBusy(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) verifyOtp(next.join(""));
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center justify-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-pop">
          <Zap size={20} strokeWidth={2.5} />
        </span>
        <div className="leading-tight">
          <p className="text-lg font-bold tracking-tight text-slate-900">
            BillForge
          </p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Billing &amp; Bid Management
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-pop">
        {step === "identify" ? (
          <>
            <h1 className="text-lg font-semibold text-slate-900">
              Sign in to your store
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {method === "password"
                ? "Use your email and password."
                : "We'll email you a one-time passcode."}
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  Email
                </span>
                <Input
                  autoFocus
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (method === "password" ? loginWithPassword() : sendOtp())
                  }
                />
              </label>

              {method === "password" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-700">
                    Password
                  </span>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loginWithPassword()}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              )}
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <Button
              size="lg"
              className="mt-6 w-full"
              onClick={method === "password" ? loginWithPassword : sendOtp}
              disabled={busy || !email.trim()}
            >
              {busy
                ? "Please wait…"
                : method === "password"
                  ? "Sign in"
                  : "Send one-time code"}
            </Button>

            <button
              onClick={() => {
                setMethod((m) => (m === "password" ? "otp" : "password"));
                setError("");
              }}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
            >
              <KeyRound size={12} />
              {method === "password"
                ? "Sign in with a one-time code instead"
                : "Sign in with password instead"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setStep("identify");
                setOtp(["", "", "", "", "", ""]);
                setError("");
                setDevCode("");
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={13} />
              Back
            </button>

            <h1 className="text-lg font-semibold text-slate-900">
              Enter verification code
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              A 6-digit code was sent to{" "}
              <span className="font-medium text-slate-800">{email}</span>
            </p>

            <div className="mt-6 flex justify-between gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  value={digit}
                  inputMode="numeric"
                  maxLength={1}
                  disabled={busy}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-12 rounded-lg border border-slate-300 text-center text-lg font-semibold text-slate-900 shadow-card transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
                />
              ))}
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <p className="mt-5 text-center text-xs text-slate-500">
              Didn&apos;t receive it?{" "}
              <button
                onClick={sendOtp}
                className="font-medium text-brand-700 hover:underline"
              >
                Resend code
              </button>
            </p>
            {devCode && (
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Dev mode (no email service configured) — your code is{" "}
                <span className="font-mono font-semibold text-slate-600">
                  {devCode}
                </span>
              </p>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        New to BillForge?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-700 hover:underline"
        >
          Create your store account
        </Link>
      </p>
    </div>
  );
}
