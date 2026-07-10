"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, IndianRupee, Plus, Search, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, invoiceStatusTone } from "@/components/ui/Badge";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Field, Input, Select } from "@/components/ui/Input";
import { Invoice } from "@/types";
import { cn, downloadCsv, formatCurrency, formatDate } from "@/lib/utils";

const tabs = ["All", "Pending", "Overdue", "Paid", "Draft"] as const;

export default function InvoicesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [query, setQuery] = useState("");

  // record payment modal
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices?limit=100");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openPay = (inv: Invoice) => {
    setPayFor(inv);
    setPayAmount(String(inv.balance));
    setPayMode("cash");
    setPayRef("");
    setPayError("");
  };

  const recordPayment = async () => {
    if (!payFor || paying) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setPayError("Enter an amount above zero");
      return;
    }
    if (amount > payFor.balance) {
      setPayError(`Maximum ${formatCurrency(payFor.balance)} is outstanding`);
      return;
    }
    setPaying(true);
    try {
      const res = await fetch(`/api/invoices/${payFor.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, mode: payMode, reference: payRef }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error ?? "Could not record the payment");
        return;
      }
      setPayFor(null);
      await load();
    } catch {
      setPayError("Network error — try again");
    } finally {
      setPaying(false);
    }
  };

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const matchesTab =
          tab === "All" ||
          (tab === "Pending" &&
            (i.status === "pending" || i.status === "partially-paid")) ||
          i.status === tab.toLowerCase();
        return (
          matchesTab &&
          (i.customer.toLowerCase().includes(query.toLowerCase()) ||
            i.number.toLowerCase().includes(query.toLowerCase()))
        );
      }),
    [items, tab, query]
  );

  const totals = useMemo(
    () => ({
      receivable: items.reduce((s, i) => s + i.balance, 0),
      overdue: items
        .filter((i) => i.status === "overdue")
        .reduce((s, i) => s + i.balance, 0),
      collected: items.reduce((s, i) => s + (i.amount - i.balance), 0),
    }),
    [items]
  );

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Invoices, quotations and payments — B2B & B2C"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  "invoices.csv",
                  filtered.map((i) => ({
                    number: i.number,
                    customer: i.customer,
                    type: i.customerType,
                    date: formatDate(i.date),
                    dueDate: formatDate(i.dueDate),
                    amount: i.amount,
                    balance: i.balance,
                    status: i.status,
                    items: i.items,
                  }))
                )
              }
            >
              <Download size={15} />
              Export
            </Button>
            <Link href="/invoices/new">
              <Button>
                <Plus size={15} />
                Create invoice
              </Button>
            </Link>
          </>
        }
      />

      {/* Record payment modal */}
      {payFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Record payment
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {payFor.number} · {payFor.customer}
                </p>
              </div>
              <button
                onClick={() => setPayFor(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs">
              <span className="font-medium text-amber-800">Outstanding</span>
              <span className="font-semibold text-amber-800">
                {formatCurrency(payFor.balance)}
              </span>
            </div>

            {payError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {payError}
              </p>
            )}

            <div className="mt-4 space-y-4">
              <Field label="Amount (₹)">
                <Input
                  autoFocus
                  inputMode="decimal"
                  className="text-right"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mode">
                  <Select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Reference">
                  <Input
                    placeholder="UTR / cheque no."
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setPayFor(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={recordPayment}
                disabled={paying}
              >
                {paying ? "Saving…" : "Record payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total receivable", value: totals.receivable, tone: "text-slate-900" },
          { label: "Overdue", value: totals.overdue, tone: "text-red-600" },
          { label: "Collected", value: totals.collected, tone: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="py-4">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className={cn("mt-1 text-xl font-semibold tracking-tight", s.tone)}>
                {formatCurrency(s.value)}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  tab === t
                    ? "bg-white text-slate-900 shadow-card"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer or invoice #…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Customer</Th>
              <Th>Date</Th>
              <Th>Due date</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Balance</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <Td colSpan={8} className="py-12 text-center text-slate-400">
                  Loading invoices…
                </Td>
              </tr>
            )}
            {!loading &&
              filtered.map((inv) => (
                <Tr
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/invoices/${inv.id}/edit`)}
                >
                  <Td className="font-mono text-xs font-medium text-slate-900">
                    {inv.number}
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800">{inv.customer}</p>
                    <Badge tone={inv.customerType === "B2B" ? "blue" : "violet"}>
                      {inv.customerType}
                    </Badge>
                  </Td>
                  <Td className="text-slate-600">{formatDate(inv.date)}</Td>
                  <Td className="text-slate-600">{formatDate(inv.dueDate)}</Td>
                  <Td className="text-right font-medium text-slate-900">
                    {formatCurrency(inv.amount)}
                  </Td>
                  <Td
                    className={cn(
                      "text-right font-medium",
                      inv.balance > 0 ? "text-amber-700" : "text-slate-400"
                    )}
                  >
                    {formatCurrency(inv.balance)}
                  </Td>
                  <Td>
                    <Badge tone={invoiceStatusTone[inv.status]}>
                      {inv.status.replace("-", " ")}
                    </Badge>
                  </Td>
                  <Td>
                    {inv.balance > 0 && inv.status !== "draft" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPay(inv);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <IndianRupee size={11} />
                        Record payment
                      </button>
                    )}
                  </Td>
                </Tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <Td colSpan={8} className="py-12 text-center text-slate-400">
                  {items.length === 0
                    ? "No invoices yet — create your first one."
                    : "No invoices match your search."}
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
