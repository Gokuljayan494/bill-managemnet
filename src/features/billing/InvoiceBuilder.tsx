"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  Paperclip,
  Plus,
  ScanBarcode,
  Search,
  StickyNote,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Customer, Product } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface LineItem {
  key: number;
  product: Product;
  variant: string;
  qty: number;
  freeQty: number;
  unit: string;
  rate: number;
  discountPct: number;
  warehouse: string;
  note: string;
  showNote: boolean;
}

// client-side Zod schema — same rules the server enforces
const lineSchema = z.object({
  qty: z.number().positive("quantity must be above zero").max(1_000_000),
  freeQty: z.number().min(0, "free quantity cannot be negative"),
  rate: z.number().min(0, "rate cannot be negative").max(100_000_000),
  discountPct: z
    .number()
    .min(0, "discount cannot be negative")
    .max(100, "discount cannot exceed 100%"),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  date: z.string().min(1, "Pick an invoice date"),
  items: z.array(lineSchema).min(1, "Add at least one item"),
  amountReceived: z
    .number()
    .min(0, "Amount received cannot be negative")
    .max(1_000_000_000),
});

export function InvoiceBuilder({
  invoiceId,
  initial,
}: {
  invoiceId?: string;
  initial?: any;
}) {
  const router = useRouter();
  const isEdit = Boolean(invoiceId);

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(
    initial?.customerId
      ? String(initial.customerId)
      : isEdit
        ? "walk-in" // saved invoice without a linked customer = walk-in sale
        : ""
  );

  // quick-add customer (name + phone is enough — full details later)
  const [quickAdd, setQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickType, setQuickType] = useState<"B2C" | "B2B">("B2C");
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [date, setDate] = useState(() =>
    initial?.date
      ? String(initial.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [terms, setTerms] = useState(initial?.paymentTerms ?? "Net 15");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [priceLevel, setPriceLevel] = useState<"retail" | "wholesale">("retail");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // payments (edit mode can add/clear them)
  const [paidSoFar, setPaidSoFar] = useState<number>(
    (initial?.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0)
  );
  const [payAmt, setPayAmt] = useState("");
  const [payBusy, setPayBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [productsRes, customersRes] = await Promise.all([
        fetch("/api/products?limit=200"),
        fetch("/api/customers"),
      ]);
      const productsData = await productsRes.json();
      const customersData = await customersRes.json();
      const loadedCatalog: Product[] = productsData.items ?? [];
      setCatalog(loadedCatalog);
      setCustomers(customersData.items ?? []);

      // edit mode: rebuild line items from the saved invoice
      if (initial?.items) {
        const byId = new Map(loadedCatalog.map((p) => [p.id, p]));
        setItems(
          initial.items
            .map((it: any, i: number) => {
              const product = byId.get(String(it.productId));
              if (!product) return null;
              return {
                key: i + 1,
                product,
                variant: it.variant ?? "",
                qty: it.qty,
                freeQty: it.freeQty ?? 0,
                unit: it.unit ?? product.unit,
                rate: it.rate,
                discountPct: it.discountPct ?? 0,
                warehouse: it.warehouse || product.warehouse,
                note: it.note ?? "",
                showNote: Boolean(it.note),
              };
            })
            .filter(Boolean) as LineItem[]
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const warehouses = useMemo(
    () => [...new Set(catalog.map((p) => p.warehouse))].sort(),
    [catalog]
  );

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  const addProduct = (p: Product) => {
    setItems((prev) => [
      ...prev,
      {
        key: Date.now(),
        product: p,
        variant: p.variants?.[0] ?? "",
        qty: 1,
        freeQty: 0,
        unit: p.unit,
        rate: priceLevel === "retail" ? p.retailPrice : p.wholesalePrice,
        discountPct: 0,
        warehouse: p.warehouse,
        note: "",
        showNote: false,
      },
    ]);
    setSearch("");
  };

  const update = (key: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const saveQuickCustomer = async () => {
    if (quickSaving) return;
    if (!quickName.trim()) {
      setQuickError("Name is required");
      return;
    }
    setQuickSaving(true);
    setQuickError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickName.trim(),
          phone: quickPhone.trim(),
          type: quickType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuickError(data.error ?? "Could not save");
        return;
      }
      setCustomers((prev) =>
        [...prev, data.item].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCustomerId(data.item.id);
      setQuickAdd(false);
      setQuickName("");
      setQuickPhone("");
    } catch {
      setQuickError("Network error");
    } finally {
      setQuickSaving(false);
    }
  };

  // edit mode: record an extra payment against the saved invoice
  const recordPaymentNow = async (amountOverride?: number) => {
    if (!invoiceId || payBusy) return;
    const amount = amountOverride ?? Number(payAmt);
    const due = Math.max(0, grandTotal - paidSoFar);
    if (!amount || amount <= 0) {
      setErrors(["Enter a payment amount above zero"]);
      return;
    }
    if (amount > due) {
      setErrors([`Maximum ${formatCurrency(due)} is outstanding`]);
      return;
    }
    setPayBusy(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, mode: paymentMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "Could not record the payment"]);
        return;
      }
      setPaidSoFar((p) => p + amount);
      setPayAmt("");
    } finally {
      setPayBusy(false);
    }
  };

  // edit mode: clear payments → back to unpaid
  const markUnpaid = async () => {
    if (!invoiceId || payBusy) return;
    if (!window.confirm("Clear all recorded payments and mark this invoice unpaid?"))
      return;
    setPayBusy(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "DELETE",
      });
      if (res.ok) setPaidSoFar(0);
      else {
        const data = await res.json().catch(() => ({}));
        setErrors([data.error ?? "Could not update the invoice"]);
      }
    } finally {
      setPayBusy(false);
    }
  };

  const lineTotals = (it: LineItem) => {
    const gross = it.qty * it.rate;
    const discount = gross * (it.discountPct / 100);
    const taxable = gross - discount;
    const gst = taxable * (it.product.gstRate / 100);
    return { taxable, gst, total: taxable + gst };
  };

  const totals = items.reduce(
    (acc, it) => {
      const t = lineTotals(it);
      return {
        subtotal: acc.subtotal + it.qty * it.rate,
        discount: acc.discount + it.qty * it.rate * (it.discountPct / 100),
        gst: acc.gst + t.gst,
        grand: acc.grand + t.total,
      };
    },
    { subtotal: 0, discount: 0, gst: 0, grand: 0 }
  );
  const grandTotal = Math.round(totals.grand);
  const received = Number(amountReceived) || 0;

  const statusPreview = isEdit
    ? grandTotal - paidSoFar <= 0
      ? "paid"
      : paidSoFar > 0
        ? "partially-paid"
        : "pending"
    : received >= grandTotal && grandTotal > 0
      ? "paid"
      : received > 0
        ? "partially-paid"
        : "pending";

  const validate = (): boolean => {
    const result = formSchema.safeParse({
      customerId,
      date,
      items: items.map((it) => ({
        qty: it.qty,
        freeQty: it.freeQty,
        rate: it.rate,
        discountPct: it.discountPct,
      })),
      amountReceived: received,
    });

    const found: string[] = [];
    if (!result.success) {
      for (const issue of result.error.issues.slice(0, 5)) {
        const [head, index] = issue.path;
        found.push(
          head === "items" && typeof index === "number"
            ? `Item ${index + 1} (${items[index]?.product.name ?? ""}): ${issue.message}`
            : issue.message
        );
      }
    }
    if (!isEdit && received > grandTotal) {
      found.push("Amount received cannot exceed the invoice total");
    }
    setErrors(found);
    return found.length === 0;
  };

  const save = async (status: "pending" | "draft") => {
    if (saving) return;
    if (status !== "draft" && !validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (status === "draft" && items.length === 0) {
      setErrors(["Add at least one item before saving a draft"]);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices",
        {
          method: invoiceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId:
              customerId && customerId !== "walk-in" ? customerId : undefined,
            customerName:
              customerId === "walk-in"
                ? initial?.customer?.name ?? "Walk-in customer"
                : undefined,
            customerType: customerId === "walk-in" ? "B2C" : undefined,
            date,
            paymentTerms: terms,
            status,
            amountReceived: isEdit ? 0 : received,
            paymentMode,
            items: items.map((it) => ({
              productId: it.product.id,
              variant: it.variant,
              unit: it.unit,
              qty: it.qty,
              freeQty: it.freeQty,
              rate: it.rate,
              discountPct: it.discountPct,
              warehouse: it.warehouse,
              note: it.note,
            })),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "Could not save the invoice"]);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push("/invoices");
      router.refresh();
    } catch {
      setErrors(["Network error — try again"]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-card hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {isEdit ? `Edit ${initial?.number ?? "invoice"}` : "New invoice"}
            </h1>
            <p className="text-xs text-slate-500">
              {isEdit
                ? `Editing recalculates totals and stock`
                : "Number auto-generated on save"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(!isEdit || initial?.status === "draft") && (
            <Button
              variant="secondary"
              onClick={() => save("draft")}
              disabled={saving}
            >
              Save draft
            </Button>
          )}
          <Button onClick={() => save("pending")} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Save & send"}
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 space-y-1 rounded-lg bg-red-50 px-4 py-3">
          {errors.map((e, i) => (
            <p key={i} className="text-sm font-medium text-red-600">
              {e}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="space-y-6 xl:col-span-3">
          {/* Customer & meta */}
          <Card>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Customer" className="lg:col-span-2">
                <div className="relative flex gap-2">
                  <Select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Select customer…</option>
                    <option value="walk-in">Walk-in customer (no account)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    title="Quick-add customer"
                    onClick={() => {
                      setQuickAdd((q) => !q);
                      setQuickError("");
                    }}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-card transition-colors",
                      quickAdd
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <UserPlus size={15} />
                  </button>

                  {quickAdd && (
                    <div className="absolute left-0 top-11 z-20 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-pop">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-900">
                          Quick-add customer
                        </p>
                        <button
                          onClick={() => setQuickAdd(false)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Just name & phone — add GSTIN and address later from
                        Customers.
                      </p>
                      {quickError && (
                        <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600">
                          {quickError}
                        </p>
                      )}
                      <div className="mt-3 space-y-2.5">
                        <Input
                          autoFocus
                          className="h-8"
                          placeholder="Customer name *"
                          value={quickName}
                          onChange={(e) => setQuickName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && saveQuickCustomer()
                          }
                        />
                        <div className="flex gap-2">
                          <Input
                            className="h-8"
                            placeholder="Phone (optional)"
                            value={quickPhone}
                            onChange={(e) => setQuickPhone(e.target.value)}
                          />
                          <div className="flex shrink-0 rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium">
                            {(["B2C", "B2B"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => setQuickType(t)}
                                className={cn(
                                  "rounded-md px-2 py-1 transition-colors",
                                  quickType === t
                                    ? "bg-white text-slate-900 shadow-card"
                                    : "text-slate-500"
                                )}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={saveQuickCustomer}
                          disabled={quickSaving}
                        >
                          <Plus size={13} />
                          {quickSaving ? "Adding…" : "Add & select"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Invoice date">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="Payment terms">
                <Select value={terms} onChange={(e) => setTerms(e.target.value)}>
                  <option>Due on receipt</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                </Select>
              </Field>
            </CardBody>
          </Card>

          {/* Product search */}
          <Card>
            <CardHeader
              title="Items"
              action={
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                  {(["retail", "wholesale"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setPriceLevel(lvl)}
                      className={cn(
                        "rounded-md px-2.5 py-1 capitalize transition-colors",
                        priceLevel === lvl
                          ? "bg-white text-slate-900 shadow-card"
                          : "text-slate-500"
                      )}
                    >
                      {lvl} price
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody className="pt-3">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  className="pl-9 pr-10"
                  placeholder="Search product name, SKU, or category — or scan barcode"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  title="Scan barcode"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                >
                  <ScanBarcode size={16} />
                </button>

                {results.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto thin-scroll rounded-xl border border-slate-200 bg-white shadow-pop">
                    {results.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-brand-50/50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                          {p.image}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {p.sku} · {p.warehouse}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              priceLevel === "retail"
                                ? p.retailPrice
                                : p.wholesalePrice
                            )}
                          </p>
                          <Badge
                            tone={
                              p.stock <= 0
                                ? "red"
                                : p.stock <= p.reorderLevel
                                  ? "amber"
                                  : "green"
                            }
                          >
                            {p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Line items */}
              {items.length === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    No items yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {catalog.length === 0
                      ? "Your catalog is empty — add products first."
                      : "Search above or scan a barcode to add products"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map((it) => {
                    const t = lineTotals(it);
                    return (
                      <div
                        key={it.key}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                            {it.product.image}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {it.product.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {it.product.sku} · GST {it.product.gstRate}% · HSN{" "}
                              {it.product.hsn}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-slate-900">
                            {formatCurrency(t.total)}
                          </p>
                          <button
                            onClick={() =>
                              setItems((prev) =>
                                prev.filter((x) => x.key !== it.key)
                              )
                            }
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                          {it.product.variants &&
                            it.product.variants.length > 0 && (
                              <Field label="Variant" className="col-span-2 lg:col-span-1">
                                <Select
                                  className="h-8"
                                  value={it.variant}
                                  onChange={(e) =>
                                    update(it.key, { variant: e.target.value })
                                  }
                                >
                                  {it.product.variants.map((v) => (
                                    <option key={v}>{v}</option>
                                  ))}
                                </Select>
                              </Field>
                            )}
                          <Field label="Qty">
                            <Input
                              className="h-8 text-right"
                              inputMode="decimal"
                              value={it.qty}
                              onChange={(e) =>
                                update(it.key, {
                                  qty: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </Field>
                          <Field label="Free qty">
                            <Input
                              className="h-8 text-right"
                              inputMode="decimal"
                              value={it.freeQty}
                              onChange={(e) =>
                                update(it.key, {
                                  freeQty: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </Field>
                          <Field label="Unit">
                            <Select
                              className="h-8"
                              value={it.unit}
                              onChange={(e) =>
                                update(it.key, { unit: e.target.value })
                              }
                            >
                              <option>{it.product.unit}</option>
                              <option>Piece</option>
                              <option>Box</option>
                              <option>Carton</option>
                            </Select>
                          </Field>
                          <Field label="Rate (₹)">
                            <Input
                              className="h-8 text-right"
                              inputMode="decimal"
                              value={it.rate}
                              onChange={(e) =>
                                update(it.key, {
                                  rate: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </Field>
                          <Field label="Disc %">
                            <Input
                              className="h-8 text-right"
                              inputMode="decimal"
                              value={it.discountPct}
                              onChange={(e) =>
                                update(it.key, {
                                  discountPct: Math.min(
                                    100,
                                    Math.max(0, Number(e.target.value) || 0)
                                  ),
                                })
                              }
                            />
                          </Field>
                          <Field label="Warehouse" className="col-span-2 lg:col-span-1">
                            <Select
                              className="h-8"
                              value={it.warehouse}
                              onChange={(e) =>
                                update(it.key, { warehouse: e.target.value })
                              }
                            >
                              {(warehouses.length > 0
                                ? warehouses
                                : [it.warehouse]
                              ).map((w) => (
                                <option key={w}>{w}</option>
                              ))}
                            </Select>
                          </Field>
                          <div className="flex items-end gap-1 pb-0.5">
                            <button
                              title="Add note"
                              onClick={() =>
                                update(it.key, { showNote: !it.showNote })
                              }
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                                it.showNote || it.note
                                  ? "border-brand-200 bg-brand-50 text-brand-700"
                                  : "border-slate-200 text-slate-400 hover:bg-slate-50"
                              )}
                            >
                              <StickyNote size={14} />
                            </button>
                            <button
                              title="Attach file"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
                            >
                              <Paperclip size={14} />
                            </button>
                          </div>
                        </div>

                        {it.showNote && (
                          <Input
                            className="mt-3 h-8"
                            placeholder="Line note (printed on invoice)…"
                            value={it.note}
                            onChange={(e) =>
                              update(it.key, { note: e.target.value })
                            }
                          />
                        )}

                        <div className="mt-3 flex justify-end gap-4 border-t border-slate-100 pt-2 text-xs text-slate-500">
                          <span>Taxable {formatCurrency(t.taxable)}</span>
                          <span>
                            GST {it.product.gstRate}% = {formatCurrency(t.gst)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card className="sticky top-20">
            <CardHeader title="Summary" subtitle="Updates live as you edit" />
            <CardBody className="space-y-2.5 pt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span className="text-red-500">
                  − {formatCurrency(totals.discount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST</span>
                <span>{formatCurrency(totals.gst)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Round off</span>
                <span>{formatCurrency(grandTotal - totals.grand)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>

              {/* Payment / status */}
              <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                {isEdit ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Paid so far</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(paidSoFar)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Balance due</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(Math.max(0, grandTotal - paidSoFar))}
                      </span>
                    </div>

                    {grandTotal - paidSoFar > 0 && (
                      <>
                        <div className="flex gap-2 pt-1">
                          <Input
                            className="h-8 bg-white text-right"
                            inputMode="decimal"
                            placeholder={String(grandTotal - paidSoFar)}
                            value={payAmt}
                            onChange={(e) => setPayAmt(e.target.value)}
                          />
                          <Select
                            className="h-8 w-28 bg-white"
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                          >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank">Bank</option>
                            <option value="card">Card</option>
                            <option value="cheque">Cheque</option>
                            <option value="other">Other</option>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            disabled={payBusy}
                            onClick={() => recordPaymentNow()}
                          >
                            {payBusy ? "Saving…" : "Record payment"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            disabled={payBusy}
                            onClick={() =>
                              recordPaymentNow(grandTotal - paidSoFar)
                            }
                          >
                            Mark paid in full
                          </Button>
                        </div>
                      </>
                    )}
                    {paidSoFar > 0 && (
                      <button
                        onClick={markUnpaid}
                        disabled={payBusy}
                        className="w-full text-center text-[11px] font-medium text-red-500 hover:underline"
                      >
                        Mark as unpaid (clear payments)
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Field label="Amount received now (₹)">
                      <Input
                        className="h-8 bg-white text-right"
                        inputMode="decimal"
                        placeholder="0"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAmountReceived(String(grandTotal))}
                        className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
                      >
                        Paid in full
                      </button>
                      <button
                        onClick={() => setAmountReceived("")}
                        className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
                      >
                        Unpaid
                      </button>
                    </div>
                    {received > 0 && (
                      <Field label="Payment mode">
                        <Select
                          className="h-8 bg-white"
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank transfer</option>
                          <option value="card">Card</option>
                          <option value="cheque">Cheque</option>
                          <option value="other">Other</option>
                        </Select>
                      </Field>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                  <span className="text-xs font-medium text-slate-500">
                    Status on save
                  </span>
                  <Badge
                    tone={
                      statusPreview === "paid"
                        ? "green"
                        : statusPreview === "partially-paid"
                          ? "blue"
                          : "amber"
                    }
                  >
                    {statusPreview.replace("-", " ")}
                  </Badge>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={items.length === 0 || saving}
                  onClick={() => save("pending")}
                >
                  {saving
                    ? "Saving…"
                    : isEdit
                      ? "Save changes"
                      : "Save & send invoice"}
                </Button>
              </div>
              <p className="pt-1 text-center text-[11px] text-slate-400">
                {items.length} line item{items.length === 1 ? "" : "s"} ·{" "}
                {items.reduce((s, i) => s + i.qty + i.freeQty, 0)} units
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
