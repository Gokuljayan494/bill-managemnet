import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, bidStatusTone } from "@/components/ui/Badge";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { bids } from "@/data/bids";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function BidsPage() {
  const open = bids.filter((b) =>
    ["open", "closing-soon", "evaluation"].includes(b.status)
  ).length;

  return (
    <>
      <PageHeader
        title="Bid Management"
        subtitle="Procurement requests, supplier quotations and awards"
        actions={
          <Link href="/bids/new">
            <Button>
              <Plus size={15} />
              Create bid request
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active bids", value: String(open) },
          {
            label: "Responses awaiting review",
            value: String(bids.reduce((s, b) => s + b.responses, 0)),
          },
          {
            label: "Pipeline value",
            value: formatCurrency(
              bids
                .filter((b) => b.status !== "closed")
                .reduce((s, b) => s + b.estimatedValue, 0)
            ),
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="py-4">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                {s.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Bid</Th>
              <Th>Source</Th>
              <Th>Items</Th>
              <Th>Responses</Th>
              <Th className="text-right">Est. value</Th>
              <Th>Closes</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <Link href={`/bids/${b.id}`} className="group block">
                    <p className="font-medium text-slate-900 group-hover:text-brand-700">
                      {b.title}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{b.number}</p>
                  </Link>
                </Td>
                <Td>
                  <Badge tone={b.source === "gem" ? "violet" : "slate"}>
                    {b.source === "gem" ? "GeM Tender" : "Private"}
                  </Badge>
                </Td>
                <Td className="text-slate-600">{b.items.length}</Td>
                <Td>
                  <span className="font-medium text-slate-900">{b.responses}</span>
                  <span className="text-xs text-slate-400"> suppliers</span>
                </Td>
                <Td className="text-right font-medium text-slate-900">
                  {formatCurrency(b.estimatedValue)}
                </Td>
                <Td className="text-slate-600">{formatDate(b.closesAt)}</Td>
                <Td>
                  <Badge tone={bidStatusTone[b.status]}>
                    {b.status.replace("-", " ")}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
