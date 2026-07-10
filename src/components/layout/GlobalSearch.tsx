"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

interface Results {
  products: { id: string; name: string; sku: string; image: string; price: number }[];
  customers: { id: string; name: string; type: string }[];
  invoices: { id: string; number: string; customer: string; amount: number; status: string }[];
}

const empty: Results = { products: [], customers: [], invoices: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(empty);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K focuses the search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // debounced fetch
  useEffect(() => {
    if (!q.trim()) {
      setResults(empty);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          setResults(await res.json());
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const total =
    results.products.length + results.customers.length + results.invoices.length;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim() && setOpen(true)}
        placeholder="Search products, invoices, customers…"
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-12 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
        ⌘K
      </kbd>

      {open && (
        <div className="absolute z-30 mt-1.5 max-h-96 w-full overflow-y-auto thin-scroll rounded-xl border border-slate-200 bg-white py-1 shadow-pop">
          {loading && (
            <p className="px-4 py-3 text-xs text-slate-400">Searching…</p>
          )}
          {!loading && total === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400">
              Nothing matches “{q}”.
            </p>
          )}

          {results.products.length > 0 && (
            <div>
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Products
              </p>
              {results.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(`/products/${p.id}/edit`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-brand-50/60"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-sm">
                    {p.image}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-800">
                      {p.name}
                    </span>
                    <span className="text-xs text-slate-400">{p.sku}</span>
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    {formatCurrency(p.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.customers.length > 0 && (
            <div>
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Customers
              </p>
              {results.customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => go("/customers")}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-brand-50/60"
                >
                  <span className="truncate text-sm text-slate-800">
                    {c.name}
                  </span>
                  <Badge tone={c.type === "B2B" ? "blue" : "violet"}>
                    {c.type}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {results.invoices.length > 0 && (
            <div>
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Invoices
              </p>
              {results.invoices.map((i) => (
                <button
                  key={i.id}
                  onClick={() => go("/invoices")}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-brand-50/60"
                >
                  <span className="font-mono text-xs font-medium text-slate-800">
                    {i.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                    {i.customer}
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    {formatCurrency(i.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
