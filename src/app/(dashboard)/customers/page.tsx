"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Field, Input, Select } from "@/components/ui/Input";
import { Customer } from "@/types";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";

const tabs = ["All", "B2B", "B2C"] as const;

const emptyForm = {
  name: "",
  type: "B2C",
  contact: "",
  email: "",
  phone: "",
  gstin: "",
  billingAddress: "",
};

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      contact: c.contact,
      email: c.email,
      phone: c.phone,
      gstin: c.gstin ?? "",
      billingAddress: c.billingAddress ?? "",
    });
    setError("");
    setShowForm(true);
  };

  const removeCustomer = async () => {
    if (!editingId || deleting) return;
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${editingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowForm(false);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the customer");
      }
    } finally {
      setDeleting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key: keyof typeof emptyForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (saving) return;
    setError("");
    if (!form.name.trim()) {
      setError("Customer name is required");
      return;
    }
    if (form.type === "B2B" && form.gstin && form.gstin.trim().length !== 15) {
      setError("GSTIN must be exactly 15 characters");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/customers/${editingId}` : "/api/customers",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            contact: form.contact.trim() || form.name.trim(),
            gstin: form.gstin.trim().toUpperCase(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the customer");
        return;
      }
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(
    () =>
      items.filter(
        (c) =>
          (tab === "All" || c.type === tab) &&
          c.name.toLowerCase().includes(query.toLowerCase())
      ),
    [items, tab, query]
  );

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={
          loading
            ? "Loading…"
            : `${items.filter((c) => c.type === "B2B").length} businesses · ${items.filter((c) => c.type === "B2C").length} retail customers`
        }
        actions={
          <Button onClick={openCreate}>
            <Plus size={15} />
            Add customer
          </Button>
        }
      />

      {/* Add customer slide-over */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto thin-scroll bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <UserPlus size={16} />
                </span>
                <h2 className="text-sm font-semibold text-slate-900">
                  {editingId ? "Edit customer" : "Add customer"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 px-6 py-5">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}
              <Field label="Customer name *">
                <Input
                  autoFocus
                  placeholder="e.g. Sri Venkateshwara Constructions"
                  value={form.name}
                  onChange={set("name")}
                />
              </Field>
              <Field label="Customer type">
                <Select value={form.type} onChange={set("type")}>
                  <option value="B2C">B2C — Retail customer</option>
                  <option value="B2B">B2B — Business</option>
                </Select>
              </Field>
              <Field label="Contact person">
                <Input
                  placeholder="Who do you talk to?"
                  value={form.contact}
                  onChange={set("contact")}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <Input
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={set("phone")}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    placeholder="accounts@company.com"
                    value={form.email}
                    onChange={set("email")}
                  />
                </Field>
              </div>
              {form.type === "B2B" && (
                <Field label="GSTIN" hint="15 characters, e.g. 33AABCS1429B1ZK">
                  <Input
                    placeholder="33AABCS1429B1ZK"
                    maxLength={15}
                    value={form.gstin}
                    onChange={set("gstin")}
                  />
                </Field>
              )}
              <Field label="Billing address">
                <Input
                  placeholder="Street, city, state, PIN"
                  value={form.billingAddress}
                  onChange={set("billingAddress")}
                />
              </Field>
            </div>

            <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
              {editingId && (
                <Button
                  variant="danger"
                  onClick={removeCustomer}
                  disabled={deleting || saving}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              )}
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Save customer"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
              placeholder="Search customers…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th>Contact</Th>
              <Th>GSTIN</Th>
              <Th className="text-right">Outstanding</Th>
              <Th className="text-right">Lifetime business</Th>
              <Th>Since</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <Td colSpan={7} className="py-12 text-center text-slate-400">
                  Loading customers…
                </Td>
              </tr>
            )}
            {!loading &&
              filtered.map((c) => (
                <Tr
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(c)}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                        {initials(c.name)}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={c.type === "B2B" ? "blue" : "violet"}>
                      {c.type}
                    </Badge>
                  </Td>
                  <Td>
                    <p className="text-slate-700">{c.contact}</p>
                    <p className="text-xs text-slate-400">{c.phone}</p>
                  </Td>
                  <Td className="font-mono text-xs text-slate-500">
                    {c.gstin || "—"}
                  </Td>
                  <Td
                    className={cn(
                      "text-right font-medium",
                      c.balance > 0 ? "text-amber-700" : "text-slate-400"
                    )}
                  >
                    {formatCurrency(c.balance)}
                  </Td>
                  <Td className="text-right font-medium text-slate-900">
                    {formatCurrency(c.totalBusiness)}
                  </Td>
                  <Td className="text-slate-600">{formatDate(c.since)}</Td>
                </Tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <Td colSpan={7} className="py-12 text-center text-slate-400">
                  {items.length === 0
                    ? "No customers yet — add your first one."
                    : "No customers match your search."}
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
