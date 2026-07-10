"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Gavel,
  IndianRupee,
  Package,
  PackageX,
  ReceiptText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, bidStatusTone, invoiceStatusTone } from "@/components/ui/Badge";
import { bids } from "@/data/bids";
import { Invoice, Product } from "@/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface DashboardData {
  kpis: {
    revenueThisMonth: number;
    outstanding: number;
    lowStockCount: number;
    productCount: number;
  };
  trend: { month: string; total: number }[];
  recentInvoices: Invoice[];
  stockAlerts: Product[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    })();
  }, []);

  const kpis = [
    {
      label: "Revenue (this month)",
      value: data ? formatCurrency(data.kpis.revenueThisMonth) : "—",
      icon: IndianRupee,
    },
    {
      label: "Outstanding receivables",
      value: data ? formatCurrency(data.kpis.outstanding) : "—",
      icon: ReceiptText,
    },
    {
      label: "Products in catalog",
      value: data ? String(data.kpis.productCount) : "—",
      icon: Package,
    },
    {
      label: "Low / out of stock",
      value: data ? `${data.kpis.lowStockCount} items` : "—",
      icon: PackageX,
    },
  ];

  const trend = data?.trend ?? [];
  const max = Math.max(1, ...trend.map((t) => t.total));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Here's what's happening across billing and inventory today."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardBody className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {value}
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon size={17} />
              </span>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue chart */}
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue trend" subtitle="Last 12 months" />
          <CardBody>
            {trend.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Revenue appears here once you start invoicing.
              </div>
            ) : (
              <div className="flex h-48 items-end gap-2">
                {trend.map((t, i) => (
                  <div
                    key={i}
                    className="group flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-md transition-colors",
                          i === trend.length - 1
                            ? "bg-brand-600"
                            : "bg-brand-200 group-hover:bg-brand-400"
                        )}
                        style={{
                          height: `${Math.max(2, (t.total / max) * 100)}%`,
                        }}
                        title={formatCurrency(t.total)}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">
                      {t.month}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Bids preview (V2) */}
        <Card>
          <CardHeader
            title="Bids in play"
            subtitle="Preview — module arrives in V2"
            action={
              <Link
                href="/bids"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="space-y-3 pt-3">
            {bids.slice(0, 3).map((b) => (
              <Link
                key={b.id}
                href={`/bids/${b.id}`}
                className="block rounded-lg border border-slate-100 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {b.title}
                  </p>
                  <Badge tone={bidStatusTone[b.status]}>
                    {b.status.replace("-", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {b.number} · {b.responses} responses
                </p>
              </Link>
            ))}
            <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
              <Gavel size={13} />
              Sample data — bid management ships in version 2.
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent invoices */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent invoices"
            action={
              <Link
                href="/invoices"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="space-y-1 pt-2">
            {!data && (
              <p className="py-8 text-center text-sm text-slate-400">
                Loading…
              </p>
            )}
            {data && data.recentInvoices.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-slate-500">
                  No invoices yet
                </p>
                <Link
                  href="/invoices/new"
                  className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                >
                  Create your first invoice →
                </Link>
              </div>
            )}
            {data?.recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {inv.customer}
                  </p>
                  <p className="text-xs text-slate-400">
                    {inv.number} · {formatDate(inv.date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={invoiceStatusTone[inv.status]}>
                    {inv.status.replace("-", " ")}
                  </Badge>
                  <p className="w-24 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(inv.amount)}
                  </p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Stock alerts */}
        <Card>
          <CardHeader title="Stock alerts" subtitle="At or below reorder level" />
          <CardBody className="space-y-3 pt-3">
            {data && data.stockAlerts.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                All stock levels are healthy.
              </p>
            )}
            {data?.stockAlerts.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg">
                  {p.image}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.sku} · {p.warehouse}
                  </p>
                </div>
                <Badge tone={p.stock <= 0 ? "red" : "amber"}>
                  {p.stock <= 0 ? "Out" : `${p.stock} left`}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
