"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error ??
            (res.status >= 500
              ? "Something went wrong on the server — please try again"
              : "Sign in failed")
        );
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
        <h1 className="text-lg font-semibold text-slate-900">
          Sign in to your store
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Use your email and password.
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
              onKeyDown={(e) => e.key === "Enter" && loginWithPassword()}
            />
          </label>

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
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={loginWithPassword}
          disabled={busy || !email.trim()}
        >
          {busy ? "Please wait…" : "Sign in"}
        </Button>
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
