"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  FileText,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Plus,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const UNITS = [
  "Piece", "Kilogram", "Gram", "Litre", "Millilitre", "Tonne", "Meter",
  "Feet", "Box", "Pack", "Bundle", "Roll", "Sheet", "Carton", "Bottle", "Bag",
];

const CATEGORIES = [
  "Electrical", "Cables & Wires", "Construction", "Metals", "Machinery",
  "Safety", "Paints", "Furniture", "General",
];

interface UnitConversion {
  id: number;
  from: string;
  qty: string;
  to: string;
}

interface VariantOption {
  id: number;
  name: string;
  values: string;
}

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export function ProductForm({
  productId,
  initial,
}: {
  productId?: string;
  initial?: any;
}) {
  const router = useRouter();
  const isEdit = Boolean(productId);
  const stock0 = initial?.stock?.[0];
  const p0 = initial?.prices;

  // basic info
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? ""
  );
  const [internalNotes, setInternalNotes] = useState(
    initial?.internalNotes ?? ""
  );

  // identification
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [hsn, setHsn] = useState(initial?.hsn ?? "");
  const [itemCode, setItemCode] = useState(initial?.itemCode ?? "");
  const [internalCode, setInternalCode] = useState(initial?.internalCode ?? "");
  const [mpn, setMpn] = useState(initial?.mpn ?? "");

  // organization
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [tags, setTags] = useState<string>(
    (initial?.tags ?? []).join(", ")
  );
  const [status, setStatus] = useState(initial?.status ?? "active");

  // units
  const [baseUnit, setBaseUnit] = useState(initial?.baseUnit ?? "Piece");
  const [sellingUnit, setSellingUnit] = useState(
    initial?.sellingUnit || initial?.baseUnit || "Piece"
  );
  const [conversions, setConversions] = useState<UnitConversion[]>(
    (initial?.conversions ?? []).map((c: any, i: number) => ({
      id: i + 1,
      from: c.from,
      qty: String(c.qty),
      to: c.to,
    }))
  );

  // pricing
  const [taxMode, setTaxMode] = useState<"inclusive" | "exclusive">(
    initial?.taxInclusive ? "inclusive" : "exclusive"
  );
  const [prices, setPrices] = useState({
    retail: p0?.retail ? String(p0.retail) : "",
    wholesale: p0?.wholesale ? String(p0.wholesale) : "",
    distributor: p0?.distributor ? String(p0.distributor) : "",
    dealer: p0?.dealer ? String(p0.dealer) : "",
    online: p0?.online ? String(p0.online) : "",
  });
  const [purchaseCost, setPurchaseCost] = useState(
    initial?.purchaseCost ? String(initial.purchaseCost) : ""
  );
  const [gstRate, setGstRate] = useState(String(initial?.gstRate ?? 18));

  // inventory
  const [warehouse, setWarehouse] = useState(stock0?.warehouse ?? "Main");
  const [openingStock, setOpeningStock] = useState(
    stock0?.onHand != null ? String(stock0.onHand) : ""
  );
  const [reorderLevel, setReorderLevel] = useState(
    stock0?.reorderLevel ? String(stock0.reorderLevel) : ""
  );
  const [minStock, setMinStock] = useState(
    stock0?.minStock ? String(stock0.minStock) : ""
  );
  const [maxStock, setMaxStock] = useState(
    stock0?.maxStock ? String(stock0.maxStock) : ""
  );
  const [tracking, setTracking] = useState({
    batch: initial?.tracking?.batch ?? false,
    expiry: initial?.tracking?.expiry ?? false,
    serial: initial?.tracking?.serial ?? false,
    lot: initial?.tracking?.lot ?? false,
  });

  // variants
  const existingVariantNames: string[] = (initial?.variants ?? []).map(
    (v: any) => v.name
  );
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [variantData, setVariantData] = useState<
    Record<string, { price: string; stock: string }>
  >(
    Object.fromEntries(
      (initial?.variants ?? []).map((v: any) => [
        v.name,
        {
          price: v.price ? String(v.price) : "",
          stock: v.stock ? String(v.stock) : "",
        },
      ])
    )
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const optionCombos = useMemo(
    () =>
      options
        .map((o) => o.values.split(",").map((v) => v.trim()).filter(Boolean))
        .filter((vals) => vals.length > 0)
        .reduce<string[][]>(
          (acc, vals) => acc.flatMap((combo) => vals.map((v) => [...combo, v])),
          [[]]
        )
        .filter((c) => c.length > 0)
        .map((c) => c.join(" / ")),
    [options]
  );

  // in edit mode, keep showing saved variants until new options are typed
  const variantCombos =
    optionCombos.length > 0 ? optionCombos : existingVariantNames;

  const margin = useMemo(() => {
    const retail = num(prices.retail);
    const cost = num(purchaseCost);
    if (retail <= 0 || cost <= 0) return null;
    return {
      pct: (((retail - cost) / retail) * 100).toFixed(1),
      abs: retail - cost,
    };
  }, [prices.retail, purchaseCost]);

  const save = async (asDraft = false) => {
    if (saving) return;
    setError("");
    if (!name.trim()) {
      setError("Product name is required");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (num(prices.retail) <= 0) {
      setError("Retail price must be above zero");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    try {
      // preserve stock entries for warehouses other than the one on this form
      const stockRest = (initial?.stock ?? [])
        .slice(1)
        .map((s: any) => ({
          warehouse: s.warehouse,
          onHand: s.onHand ?? 0,
          reserved: s.reserved ?? 0,
          reorderLevel: s.reorderLevel ?? 0,
          minStock: s.minStock ?? 0,
          maxStock: s.maxStock ?? 0,
        }));
      const res = await fetch(
        productId ? `/api/products/${productId}` : "/api/products",
        {
          method: productId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description,
          shortDescription,
          internalNotes,
          sku: sku.trim(),
          barcode: barcode.trim(),
          hsn: hsn.trim(),
          itemCode: itemCode.trim(),
          internalCode: internalCode.trim(),
          mpn: mpn.trim(),
          category,
          brand: brand.trim(),
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          baseUnit,
          sellingUnit,
          conversions: conversions
            .filter((c) => num(c.qty) > 0)
            .map((c) => ({ from: c.from, qty: num(c.qty), to: c.to })),
          prices: {
            retail: num(prices.retail),
            wholesale: num(prices.wholesale),
            distributor: num(prices.distributor),
            dealer: num(prices.dealer),
            online: num(prices.online),
          },
          purchaseCost: num(purchaseCost),
          gstRate: num(gstRate),
          taxInclusive: taxMode === "inclusive",
          variants: variantCombos.map((combo) => ({
            name: combo,
            price: num(variantData[combo]?.price ?? ""),
            stock: num(variantData[combo]?.stock ?? ""),
          })),
          stock: [
            {
              warehouse: warehouse.trim() || "Main",
              onHand: num(openingStock),
              reserved: stock0?.reserved ?? 0,
              reorderLevel: num(reorderLevel),
              minStock: num(minStock),
              maxStock: num(maxStock),
            },
            ...stockRest,
          ],
          tracking,
          status: asDraft ? "draft" : status,
        }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the product");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push("/products");
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!productId || deleting) return;
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/products");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the product");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-card hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {isEdit ? "Edit product" : "Add product"}
            </h1>
            <p className="text-xs text-slate-500">
              {isEdit ? `Products · ${initial?.name ?? ""}` : "Products · Unsaved draft"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <Button
              variant="danger"
              onClick={remove}
              disabled={deleting || saving}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
          <Link href="/products">
            <Button variant="secondary">Discard</Button>
          </Link>
          {!isEdit && (
            <Button
              variant="secondary"
              onClick={() => save(true)}
              disabled={saving}
            >
              Save as draft
            </Button>
          )}
          <Button onClick={() => save(false)} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Save product"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ------- Main column ------- */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic info */}
          <Card>
            <CardBody className="space-y-4">
              <Field label="Product name">
                <Input
                  placeholder="e.g. Industrial LED Flood Light 200W"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>

              <Field label="Description">
                <div className="rounded-lg border border-slate-300 shadow-card focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
                  <div className="flex items-center gap-0.5 border-b border-slate-200 px-2 py-1.5">
                    {[Bold, Italic, List, Link2].map((Icon, i) => (
                      <button
                        key={i}
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={5}
                    placeholder="Describe features, materials, use cases…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none rounded-b-lg bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Short description">
                  <Input
                    placeholder="One-line summary for listings"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                  />
                </Field>
                <Field label="Internal notes" hint="Only visible to your team">
                  <Input
                    placeholder="e.g. Supplier lead time 2 weeks"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader
              title="Media"
              subtitle="Images, videos, documents & attachments"
            />
            <CardBody className="pt-3">
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700 shadow-card">
                  <UploadCloud size={20} />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Image upload arrives with Cloudinary setup
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Products save fine without images for now
                </p>
                <div className="mt-4 flex gap-2">
                  {[
                    { icon: ImageIcon, label: "Images" },
                    { icon: Video, label: "Videos" },
                    { icon: FileText, label: "Documents" },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-card"
                    >
                      <Icon size={12} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Identification */}
          <Card>
            <CardHeader title="Product identification" />
            <CardBody className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
              <Field label="SKU">
                <Input placeholder="ELC-FL-200" value={sku} onChange={(e) => setSku(e.target.value)} />
              </Field>
              <Field label="Barcode (EAN / UPC)">
                <Input placeholder="8901234567890" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
              </Field>
              <Field label="HSN / SAC code">
                <Input placeholder="9405" value={hsn} onChange={(e) => setHsn(e.target.value)} />
              </Field>
              <Field label="Item code">
                <Input placeholder="ITM-00120" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
              </Field>
              <Field label="Internal product code">
                <Input placeholder="INT-FL-A2" value={internalCode} onChange={(e) => setInternalCode(e.target.value)} />
              </Field>
              <Field label="Manufacturer part number (MPN)">
                <Input placeholder="MPN-LX200-IN" value={mpn} onChange={(e) => setMpn(e.target.value)} />
              </Field>
              <div className="sm:col-span-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                <Badge tone="brand">QR</Badge>
                A QR code is generated automatically from the SKU when the
                product is saved.
              </div>
            </CardBody>
          </Card>

          {/* Units & packaging */}
          <Card>
            <CardHeader
              title="Units & packaging"
              subtitle="Sell in any unit — conversions apply automatically on invoices"
            />
            <CardBody className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Base unit">
                  <Select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}>
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Default selling unit">
                  <Select value={sellingUnit} onChange={(e) => setSellingUnit(e.target.value)}>
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-700">
                  Unit conversions
                </p>
                <div className="space-y-2">
                  {conversions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                    >
                      <span className="text-xs text-slate-500">1</span>
                      <Select
                        className="h-8 w-32 bg-white"
                        value={c.from}
                        onChange={(e) =>
                          setConversions((prev) =>
                            prev.map((x) =>
                              x.id === c.id ? { ...x, from: e.target.value } : x
                            )
                          )
                        }
                      >
                        {UNITS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </Select>
                      <span className="text-xs text-slate-500">=</span>
                      <Input
                        className="h-8 w-20 bg-white text-right"
                        value={c.qty}
                        inputMode="numeric"
                        onChange={(e) =>
                          setConversions((prev) =>
                            prev.map((x) =>
                              x.id === c.id ? { ...x, qty: e.target.value } : x
                            )
                          )
                        }
                      />
                      <Select
                        className="h-8 w-32 bg-white"
                        value={c.to}
                        onChange={(e) =>
                          setConversions((prev) =>
                            prev.map((x) =>
                              x.id === c.id ? { ...x, to: e.target.value } : x
                            )
                          )
                        }
                      >
                        {UNITS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </Select>
                      <button
                        onClick={() =>
                          setConversions((prev) =>
                            prev.filter((x) => x.id !== c.id)
                          )
                        }
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setConversions((prev) => [
                      ...prev,
                      { id: Date.now(), from: "Box", qty: "24", to: "Piece" },
                    ])
                  }
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
                >
                  <Plus size={13} />
                  Add conversion (e.g. 1 Box = 24 Pieces)
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader
              title="Pricing"
              subtitle="Multiple price levels for B2B & B2C customers"
              action={
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                  {(["exclusive", "inclusive"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTaxMode(m)}
                      className={cn(
                        "rounded-md px-2.5 py-1 capitalize transition-colors",
                        taxMode === m
                          ? "bg-white text-slate-900 shadow-card"
                          : "text-slate-500"
                      )}
                    >
                      Tax {m}
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody className="pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["retail", "Retail price"],
                    ["wholesale", "Wholesale price"],
                    ["distributor", "Distributor price"],
                    ["dealer", "Dealer price"],
                    ["online", "Online price"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ₹
                      </span>
                      <Input
                        className="pl-7"
                        placeholder="0.00"
                        inputMode="decimal"
                        value={prices[key]}
                        onChange={(e) =>
                          setPrices((p) => ({ ...p, [key]: e.target.value }))
                        }
                      />
                    </div>
                  </Field>
                ))}
                <Field label="Purchase cost">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ₹
                    </span>
                    <Input
                      className="pl-7"
                      placeholder="0.00"
                      inputMode="decimal"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                    />
                  </div>
                </Field>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="GST rate">
                  <Select value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
                    {["0", "5", "12", "18", "28"].map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Discount rule">
                  <Select>
                    <option>None</option>
                    <option>5% above 100 units</option>
                    <option>10% above 500 units</option>
                  </Select>
                </Field>
                <Field label="Currency">
                  <Select defaultValue="INR — Indian Rupee">
                    <option>INR — Indian Rupee</option>
                    <option>USD — US Dollar</option>
                  </Select>
                </Field>
              </div>

              {margin && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-medium text-emerald-800">
                    Estimated profit margin
                  </p>
                  <p className="text-sm font-semibold text-emerald-700">
                    {margin.pct}% · ₹{margin.abs.toLocaleString("en-IN")} / unit
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader
              title="Variants"
              subtitle="Options like size, colour, material — combinations generate automatically"
            />
            <CardBody className="space-y-3 pt-3">
              {options.map((o) => (
                <div key={o.id} className="flex items-start gap-2">
                  <Input
                    className="w-40"
                    placeholder="Option (e.g. Size)"
                    value={o.name}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((x) =>
                          x.id === o.id ? { ...x, name: e.target.value } : x
                        )
                      )
                    }
                  />
                  <Input
                    placeholder="Values, comma separated (e.g. Small, Large)"
                    value={o.values}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((x) =>
                          x.id === o.id ? { ...x, values: e.target.value } : x
                        )
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      setOptions((prev) => prev.filter((x) => x.id !== o.id))
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setOptions((prev) => [
                    ...prev,
                    { id: Date.now(), name: "", values: "" },
                  ])
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
              >
                <Plus size={13} />
                Add option (Size, Colour, Material, Weight, Capacity…)
              </button>

              {variantCombos.length > 0 && (
                <div className="mt-2 rounded-lg border border-slate-200">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {variantCombos.length} variant
                    {variantCombos.length > 1 ? "s" : ""} will be created
                  </div>
                  <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto thin-scroll">
                    {variantCombos.map((combo) => (
                      <div
                        key={combo}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="text-sm text-slate-700">{combo}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-8 w-24 text-right"
                            placeholder="Price"
                            inputMode="decimal"
                            value={variantData[combo]?.price ?? ""}
                            onChange={(e) =>
                              setVariantData((prev) => ({
                                ...prev,
                                [combo]: {
                                  price: e.target.value,
                                  stock: prev[combo]?.stock ?? "",
                                },
                              }))
                            }
                          />
                          <Input
                            className="h-8 w-20 text-right"
                            placeholder="Stock"
                            inputMode="numeric"
                            value={variantData[combo]?.stock ?? ""}
                            onChange={(e) =>
                              setVariantData((prev) => ({
                                ...prev,
                                [combo]: {
                                  price: prev[combo]?.price ?? "",
                                  stock: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ------- Side column ------- */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Status" />
            <CardBody className="pt-3">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
              <p className="mt-2 text-xs text-slate-400">
                Active products appear in billing search and supplier catalogs.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organization" />
            <CardBody className="space-y-4 pt-3">
              <Field label="Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Brand">
                <Input placeholder="e.g. Lumina" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </Field>
              <Field label="Tags" hint="Separate with commas">
                <Input placeholder="outdoor, ip66, led" value={tags} onChange={(e) => setTags(e.target.value)} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Inventory" />
            <CardBody className="space-y-4 pt-3">
              <Field label="Warehouse">
                <Input
                  placeholder="Main"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Opening stock">
                  <Input placeholder="0" inputMode="numeric" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} />
                </Field>
                <Field label="Reorder level">
                  <Input placeholder="0" inputMode="numeric" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
                </Field>
                <Field label="Min stock">
                  <Input placeholder="0" inputMode="numeric" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                </Field>
                <Field label="Max stock">
                  <Input placeholder="0" inputMode="numeric" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
                </Field>
              </div>
              <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                {(
                  [
                    ["batch", "Batch tracking"],
                    ["expiry", "Expiry tracking"],
                    ["serial", "Serial numbers"],
                    ["lot", "Lot numbers"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={tracking[key]}
                      onChange={(e) =>
                        setTracking((t) => ({ ...t, [key]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
