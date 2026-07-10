import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  MessageSquare,
  Star,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, bidStatusTone } from "@/components/ui/Badge";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { bids } from "@/data/bids";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";

const quoteTone = {
  received: "slate",
  shortlisted: "blue",
  rejected: "red",
  awarded: "brand",
} as const;

export default async function BidDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bid = bids.find((b) => b.id === id);
  if (!bid) notFound();

  const qty = bid.items[0]?.qty ?? 1;
  const landedCost = (q: (typeof bid.quotes)[number]) =>
    q.unitPrice * qty * (1 + q.taxPct / 100) + q.freight;

  const bestLanded =
    bid.quotes.length > 0 ? Math.min(...bid.quotes.map(landedCost)) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/bids"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-card hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {bid.title}
              </h1>
              <Badge tone={bidStatusTone[bid.status]}>
                {bid.status.replace("-", " ")}
              </Badge>
              {bid.source === "gem" && <Badge tone="violet">GeM Tender</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {bid.number} · Created {formatDate(bid.createdAt)} · Closes{" "}
              {formatDate(bid.closesAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <MessageSquare size={15} />
            Q&amp;A ({bid.responses})
          </Button>
          <Button variant="secondary">Request revisions</Button>
          <Button>
            <Award size={15} />
            Award contract
          </Button>
        </div>
      </div>

      {/* Requested items */}
      <Card className="mb-6">
        <CardHeader title="Requested items" />
        <div className="pt-2">
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Specifications</Th>
                <Th className="text-right">Qty</Th>
                <Th>Delivery</Th>
                <Th>Deadline</Th>
              </tr>
            </thead>
            <tbody>
              {bid.items.map((it) => (
                <Tr key={it.id}>
                  <Td>
                    <p className="font-medium text-slate-900">{it.product}</p>
                    <Badge tone="slate">{it.category}</Badge>
                  </Td>
                  <Td className="max-w-sm text-xs text-slate-500">{it.spec}</Td>
                  <Td className="text-right font-medium text-slate-900">
                    {formatNumber(it.qty)}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      {it.unit}
                    </span>
                  </Td>
                  <Td className="text-slate-600">{it.deliveryLocation}</Td>
                  <Td className="text-slate-600">{formatDate(it.deadline)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Supplier comparison */}
      <Card>
        <CardHeader
          title="Supplier comparison"
          subtitle={
            bid.quotes.length > 0
              ? `${bid.quotes.length} quotations received · landed cost for ${formatNumber(qty)} units incl. tax & freight`
              : undefined
          }
        />
        {bid.quotes.length === 0 ? (
          <CardBody>
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">
                No quotations yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Invited suppliers will appear here as they respond.
              </p>
            </div>
          </CardBody>
        ) : (
          <div className="pt-2">
            <Table>
              <thead>
                <tr>
                  <Th>Supplier</Th>
                  <Th className="text-right">Unit price</Th>
                  <Th className="text-right">Landed cost</Th>
                  <Th className="text-right">Delivery</Th>
                  <Th className="text-right">Warranty</Th>
                  <Th>Brand / Origin</Th>
                  <Th className="text-center">Tech</Th>
                  <Th className="text-center">Comm.</Th>
                  <Th>Compliance</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {bid.quotes.map((q) => {
                  const landed = landedCost(q);
                  const best = landed === bestLanded;
                  return (
                    <Tr key={q.supplier} className={cn(best && "bg-brand-50/40")}>
                      <Td>
                        <p className="font-medium text-slate-900">{q.supplier}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <Star
                            size={11}
                            className="fill-amber-400 text-amber-400"
                          />
                          {q.rating} · {q.previousOrders} past orders
                        </p>
                        <Badge tone={quoteTone[q.status]} className="mt-1">
                          {q.status}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <p className="font-medium text-slate-900">
                          {formatCurrency(q.unitPrice)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          +{q.taxPct}% GST
                          {q.freight > 0
                            ? ` · ${formatCurrency(q.freight)} freight`
                            : " · free freight"}
                        </p>
                      </Td>
                      <Td className="text-right">
                        <p
                          className={cn(
                            "font-semibold",
                            best ? "text-brand-700" : "text-slate-900"
                          )}
                        >
                          {formatCurrency(Math.round(landed))}
                        </p>
                        {best && <Badge tone="brand">Lowest</Badge>}
                      </Td>
                      <Td className="text-right text-slate-600">
                        {q.deliveryDays} days
                      </Td>
                      <Td className="text-right text-slate-600">
                        {q.warrantyMonths / 12} yr
                      </Td>
                      <Td>
                        <p className="text-slate-700">{q.brand}</p>
                        <p className="text-xs text-slate-400">{q.origin}</p>
                      </Td>
                      <Td className="text-center">
                        <ScorePill value={q.technicalScore} />
                      </Td>
                      <Td className="text-center">
                        <ScorePill value={q.commercialScore} />
                      </Td>
                      <Td>
                        {q.compliant ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 size={13} />
                            Compliant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                            <XCircle size={13} />
                            Gaps found
                          </span>
                        )}
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Valid till {formatDate(q.validUntil)}
                        </p>
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="secondary">
                            Shortlist
                          </Button>
                          <Button size="sm" variant="ghost">
                            Negotiate
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-400">
                Awarding converts this bid directly into a purchase order.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm">
                  Reject remaining
                </Button>
                <Button size="sm">
                  <Award size={13} />
                  Award &amp; create PO
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ScorePill({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-9 items-center justify-center rounded-md text-xs font-semibold",
        value >= 90
          ? "bg-emerald-50 text-emerald-700"
          : value >= 80
            ? "bg-sky-50 text-sky-700"
            : "bg-amber-50 text-amber-700"
      )}
    >
      {value}
    </span>
  );
}
