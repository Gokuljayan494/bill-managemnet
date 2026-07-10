"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{
    email: string;
    role: string;
    org: { name: string };
  } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (res.ok) setMe(await res.json());
    })();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const letters = (me?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 ring-2 ring-white transition-opacity hover:opacity-80"
      >
        {letters}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-pop">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {me?.org.name ?? "…"}
            </p>
            <p className="truncate text-xs text-slate-400">{me?.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium capitalize text-brand-700">
              {me?.role ?? ""}
            </span>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Settings size={15} className="text-slate-400" />
            Business settings
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
