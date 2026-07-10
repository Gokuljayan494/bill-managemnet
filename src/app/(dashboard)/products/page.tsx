"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Field, Select } from "@/components/ui/Input";
import { Product } from "@/types";
import { cn, downloadCsv, formatCurrency, formatNumber, parseCsv } from "@/lib/utils";

const statusTone = { active: "green", draft: "slate", archived: "amber" } as const;

export default function ProductsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  // extra filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  // import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products?limit=200");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setShowFilters(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const seedSamples = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await load();
    } finally {
      setSeeding(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      "products.csv",
      filtered.map((p) => ({
        name: p.name,
        sku: p.sku,
        category: p.category,
        hsn: p.hsn,
        unit: p.unit,
        retail: p.retailPrice,
        wholesale: p.wholesalePrice,
        purchaseCost: p.purchaseCost,
        gstRate: p.gstRate,
        stock: p.stock,
        reorderLevel: p.reorderLevel,
        warehouse: p.warehouse,
        status: p.status,
      }))
    );
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setNotice("");
    try {
      const rows = parseCsv(await file.text());
      if (rows.length === 0) {
        setNotice("The file has no data rows. Expected headers: name, sku, category, hsn, unit, retail, wholesale, purchasecost, gstrate, stock, reorderlevel, warehouse");
        return;
      }
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Import failed");
        return;
      }
      setNotice(
        `Imported ${data.created} product${data.created === 1 ? "" : "s"}` +
          (data.failed > 0
            ? ` · ${data.failed} row${data.failed === 1 ? "" : "s"} skipped (${data.errors[0]?.message})`
            : "")
      );
      await load();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    downloadCsv("product-import-template.csv", [
      {
        name: "Sample Product",
        sku: "SKU-001",
        category: "General",
        hsn: "9405",
        unit: "Piece",
        retail: 100,
        wholesale: 90,
        purchasecost: 70,
        gstrate: 18,
        stock: 50,
        reorderlevel: 10,
        warehouse: "Main",
      },
    ]);
  };

  const categories = useMemo(
    () => [...new Set(items.map((p) => p.category))].sort(),
    [items]
  );

  const filtered = useMemo(
    () =>
      items.filter((p) => {
        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "in" && p.stock > p.reorderLevel) ||
          (stockFilter === "low" && p.stock > 0 && p.stock <= p.reorderLevel) ||
          (stockFilter === "out" && p.stock <= 0);
        return (
          (category === "All" || p.category === category) &&
          (statusFilter === "all" || p.status === statusFilter) &&
          matchesStock &&
          (p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase()))
        );
      }),
    [items, query, category, statusFilter, stockFilter]
  );

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (stockFilter !== "all" ? 1 : 0);

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={
          loading
            ? "Loading…"
            : `${items.length} products across ${categories.length} categories`
        }
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              <Upload size={15} />
              {importing ? "Importing…" : "Import"}
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <Download size={15} />
              Export
            </Button>
            <Link href="/products/new">
              <Button>
                <Plus size={15} />
                Add product
              </Button>
            </Link>
          </>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
          {notice}{" "}
          <button
            onClick={downloadTemplate}
            className="font-medium underline hover:no-underline"
          >
            Download template
          </button>
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="relative w-full max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or SKU…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto thin-scroll">
            {["All", ...categories.slice(0, 5)].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  category === c
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div ref={filterRef} className="relative ml-auto">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
                activeFilterCount > 0
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-700 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute right-0 z-20 mt-1.5 w-64 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-pop">
                <Field label="Status">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </Select>
                </Field>
                <Field label="Stock level">
                  <Select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                  >
                    <option value="all">All stock levels</option>
                    <option value="in">In stock</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                  </Select>
                </Field>
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setStockFilter("all");
                  }}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <PackagePlus size={22} />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">
              No products yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Add your first product, import a CSV, or load sample data to
              explore.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={seedSamples} disabled={seeding}>
                {seeding ? "Loading samples…" : "Load sample data"}
              </Button>
              <Link href="/products/new">
                <Button>
                  <Plus size={15} />
                  Add product
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU / HSN</Th>
                <Th>Category</Th>
                <Th className="text-right">Retail</Th>
                <Th className="text-right">Wholesale</Th>
                <Th className="text-right">Stock</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <Td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading products…
                  </Td>
                </tr>
              )}
              {!loading &&
                filtered.map((p) => (
                  <Tr
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/products/${p.id}/edit`)}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                          {p.image}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{p.name}</p>
                          {p.variants && p.variants.length > 0 && (
                            <p className="text-xs text-slate-400">
                              {p.variants.length} variants · {p.unit}
                            </p>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="font-mono text-xs text-slate-600">{p.sku}</p>
                      <p className="font-mono text-[11px] text-slate-400">
                        HSN {p.hsn}
                      </p>
                    </Td>
                    <Td>
                      <Badge tone="slate">{p.category}</Badge>
                    </Td>
                    <Td className="text-right font-medium text-slate-900">
                      {formatCurrency(p.retailPrice)}
                    </Td>
                    <Td className="text-right text-slate-600">
                      {formatCurrency(p.wholesalePrice)}
                    </Td>
                    <Td className="text-right">
                      <span
                        className={cn(
                          "font-medium",
                          p.stock <= 0
                            ? "text-red-600"
                            : p.stock <= p.reorderLevel
                              ? "text-amber-600"
                              : "text-slate-900"
                        )}
                      >
                        {formatNumber(p.stock)}
                      </span>
                      <span className="text-xs text-slate-400"> {p.unit}</span>
                    </Td>
                    <Td>
                      <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                    </Td>
                    <Td>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-brand-700">
                        <Pencil size={13} />
                      </span>
                    </Td>
                  </Tr>
                ))}
              {!loading && items.length > 0 && filtered.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-12 text-center text-slate-400">
                    No products match your search or filters.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
