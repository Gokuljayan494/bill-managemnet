"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Eye, EyeOff, Store, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Input";

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  businessName: z.string().trim().min(1, "Store / business name is required"),
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitDetails = async () => {
    if (busy) return;
    setError("");
    const result = detailsSchema.safeParse({
      name,
      businessName,
      email,
      password,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error ??
            (res.status >= 500
              ? "Something went wrong on the server — please try again"
              : "Registration failed")
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
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Store size={16} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Create your store
            </h1>
            <p className="text-xs text-slate-500">
              Free during the pilot — takes a minute.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Your name *">
            <Input
              autoFocus
              placeholder="e.g. Gokul Jayan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Store / business name *">
            <Input
              placeholder="e.g. Sri Balaji Traders"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </Field>
          <Field label="Email *">
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Phone (optional)">
            <Input
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Password *" hint="Minimum 8 characters">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitDetails()}
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
          </Field>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={submitDetails}
          disabled={busy}
        >
          {busy ? "Creating your store…" : "Create store account"}
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Already have a store?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
