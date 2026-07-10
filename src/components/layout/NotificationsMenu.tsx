"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, PackageX, ReceiptText, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "overdue" | "low-stock" | "out-of-stock";
  title: string;
  detail: string;
  href: string;
}

const icons = {
  overdue: ReceiptText,
  "low-stock": TrendingDown,
  "out-of-stock": PackageX,
};

const iconTones = {
  overdue: "bg-red-50 text-red-600",
  "low-stock": "bg-amber-50 text-amber-600",
  "out-of-stock": "bg-red-50 text-red-600",
};

export function NotificationsMenu() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoaded(true);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 120_000); // refresh every 2 min
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          open ? "bg-slate-100 text-slate-700" : "text-slate-500 hover:bg-slate-100"
        )}
      >
        <Bell size={17} />
        {items.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-80 rounded-xl border border-slate-200 bg-white py-1 shadow-pop">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-xs font-semibold text-slate-900">
              Notifications
            </p>
            <span className="text-[11px] text-slate-400">
              {items.length} alert{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto thin-scroll">
            {loaded && items.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">
                All clear — no overdue invoices or stock alerts.
              </p>
            )}
            {items.map((n) => {
              const Icon = icons[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    router.push(n.href);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      iconTones[n.type]
                    )}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {n.title}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {n.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
