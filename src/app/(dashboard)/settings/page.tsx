"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const empty = {
  name: "",
  gstin: "",
  email: "",
  phone: "",
  address: "",
  currency: "INR",
  defaultGstRate: "18",
  invoicePrefix: "INV-",
  paymentTerms: "Net 15",
};

export default function SettingsPage() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/org");
        if (res.ok) {
          const data = await res.json();
          setForm({
            name: data.name ?? "",
            gstin: data.settings.gstin ?? "",
            email: data.settings.email ?? "",
            phone: data.settings.phone ?? "",
            address: data.settings.address ?? "",
            currency: data.settings.currency ?? "INR",
            defaultGstRate: String(data.settings.defaultGstRate ?? 18),
            invoicePrefix: data.settings.invoicePrefix ?? "INV-",
            paymentTerms: data.settings.paymentTerms ?? "Net 15",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set =
    (key: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setSaved(false);
    };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          settings: {
            gstin: form.gstin.trim().toUpperCase(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            currency: form.currency,
            defaultGstRate: Number(form.defaultGstRate),
            invoicePrefix: form.invoicePrefix.trim() || "INV-",
            paymentTerms: form.paymentTerms,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="py-20 text-center text-sm text-slate-400">
        Loading settings…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Business profile, taxes and preferences"
        actions={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Check size={13} />
                Saved
              </span>
            )}
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader title="Business profile" />
          <CardBody className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
            <Field label="Business name">
              <Input value={form.name} onChange={set("name")} />
            </Field>
            <Field label="GSTIN" hint="15 characters — leave blank if unregistered">
              <Input
                maxLength={15}
                placeholder="33AABCB1234F1Z5"
                value={form.gstin}
                onChange={set("gstin")}
              />
            </Field>
            <Field label="Contact email">
              <Input
                type="email"
                placeholder="billing@yourstore.com"
                value={form.email}
                onChange={set("email")}
              />
            </Field>
            <Field label="Phone">
              <Input
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={set("phone")}
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input
                placeholder="Street, city, state, PIN"
                value={form.address}
                onChange={set("address")}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Billing preferences"
            subtitle="Defaults used when creating invoices"
          />
          <CardBody className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
            <Field label="Default currency">
              <Select value={form.currency} onChange={set("currency")}>
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
              </Select>
            </Field>
            <Field label="Default GST rate">
              <Select value={form.defaultGstRate} onChange={set("defaultGstRate")}>
                {["0", "5", "12", "18", "28"].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Invoice prefix"
              hint="New invoices continue the sequence with this prefix"
            >
              <Input value={form.invoicePrefix} onChange={set("invoicePrefix")} />
            </Field>
            <Field label="Default payment terms">
              <Select value={form.paymentTerms} onChange={set("paymentTerms")}>
                <option>Due on receipt</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
              </Select>
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
