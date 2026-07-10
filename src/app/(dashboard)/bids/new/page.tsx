"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { categories, units, warehouses } from "@/data/products";

interface BidItemDraft {
  id: number;
}

export default function NewBidPage() {
  const [lineItems, setLineItems] = useState<BidItemDraft[]>([{ id: 1 }]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/bids"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-card hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Create bid request
            </h1>
            <p className="text-xs text-slate-500">BID-2026-033 · Draft</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Save draft</Button>
          <Button>Publish to suppliers</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="space-y-4">
              <Field label="Bid title">
                <Input placeholder="e.g. Supply of LED Street Lighting — Phase 3" />
              </Field>
              <Field label="Scope & background">
                <Textarea
                  rows={3}
                  placeholder="Describe the requirement, evaluation criteria and any commercial terms…"
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Bid type">
                  <Select>
                    <option>Private RFQ</option>
                    <option>Open tender</option>
                    <option>GeM tender</option>
                    <option>Rate contract</option>
                  </Select>
                </Field>
                <Field label="Closes on">
                  <Input type="date" defaultValue="2026-07-31" />
                </Field>
                <Field label="Estimated value (₹)">
                  <Input inputMode="numeric" placeholder="0" />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Line items */}
          {lineItems.map((item, index) => (
            <Card key={item.id}>
              <CardHeader
                title={`Line item ${index + 1}`}
                action={
                  lineItems.length > 1 ? (
                    <button
                      onClick={() =>
                        setLineItems((prev) =>
                          prev.filter((x) => x.id !== item.id)
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : undefined
                }
              />
              <CardBody className="space-y-4 pt-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Product" hint="Pick from catalog or type a custom product">
                    <Input
                      list="catalog"
                      placeholder="Search catalog or enter custom product…"
                    />
                  </Field>
                  <Field label="Category">
                    <Select>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                      <option>Other</option>
                    </Select>
                  </Field>
                </div>

                <Field label="Technical specifications & minimum standards">
                  <Textarea
                    rows={3}
                    placeholder="e.g. IP66 rated, 130lm/W minimum, CRI > 70, BIS certified, 10kV surge protection…"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Quantity">
                    <Input inputMode="numeric" placeholder="0" />
                  </Field>
                  <Field label="Unit">
                    <Select>
                      {units.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Brand preference">
                    <Input placeholder="Any / specify" />
                  </Field>
                  <Field label="Warranty required">
                    <Select>
                      <option>None</option>
                      <option>12 months</option>
                      <option>24 months</option>
                      <option>36 months</option>
                      <option>60 months</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Delivery location">
                    <Select>
                      {warehouses.map((w) => (
                        <option key={w}>{w}</option>
                      ))}
                      <option>Customer site</option>
                    </Select>
                  </Field>
                  <Field label="Delivery deadline">
                    <Input type="date" />
                  </Field>
                  <Field label="Packaging requirements">
                    <Input placeholder="e.g. Export-grade palletised" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Quality requirements">
                    <Input placeholder="e.g. ISO 9001 manufacturer, ISI marked" />
                  </Field>
                  <Field label="Inspection requirements">
                    <Select>
                      <option>None</option>
                      <option>Pre-dispatch inspection</option>
                      <option>Third-party inspection</option>
                      <option>Sample approval before bulk</option>
                    </Select>
                  </Field>
                </div>

                <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-slate-200 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Attach drawings, images or reference documents for this item
                  </p>
                  <Button variant="secondary" size="sm">
                    <FileUp size={13} />
                    Upload
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}

          <Button
            variant="secondary"
            className="w-full border-dashed"
            onClick={() =>
              setLineItems((prev) => [...prev, { id: Date.now() }])
            }
          >
            <Plus size={15} />
            Add another line item
          </Button>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Invite suppliers" />
            <CardBody className="space-y-3 pt-3">
              {[
                "Lumina Industries",
                "Voltek Lighting Co",
                "Suryan Electricals",
                "BrightPath Exports",
              ].map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-100 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:border-brand-200"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                  />
                  {s}
                </label>
              ))}
              <Button variant="secondary" size="sm" className="w-full">
                <Plus size={13} />
                Add supplier by email
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Submission settings" />
            <CardBody className="space-y-4 pt-3">
              <Field label="Currency">
                <Select>
                  <option>INR — Indian Rupee</option>
                  <option>USD — US Dollar</option>
                </Select>
              </Field>
              <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                {[
                  "Allow partial quantity quotes",
                  "Allow alternative brands",
                  "Require compliance certificates",
                  "Enable clarification Q&A",
                  "Sealed bids (open after closing)",
                ].map((label, i) => (
                  <label
                    key={label}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={i < 4}
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
