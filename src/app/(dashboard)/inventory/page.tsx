"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Download, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { cn, downloadCsv, formatNumber } from "@/lib/utils";

interface StockRow {
  productId: string;
  name: string;
  sku: string;
  image: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderLevel: number;
}

export default function InventoryPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [warehouseList, setWarehouseList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/inventory");
        const data = await res.json();
        setRows(data.rows ?? []);
        setWarehouseList(data.warehouses ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => warehouse === "All" || r.warehouse === warehouse),
    [rows, warehouse]
  );

  const totalUnits = filtered.reduce((s, r) => s + r.onHand, 0);
  const lowCount = filtered.filter(
    (r) => r.onHand > 0 && r.onHand <= r.reorderLevel
  ).length;
  const outCount = filtered.filter((r) => r.onHand <= 0).length;

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels, reservations and movements across warehouses"
        actions={
          <>
            <Button variant="secondary">
              <ArrowLeftRight size={15} />
              Stock transfer
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  "inventory.csv",
                  filtered.map((r) => ({
                    product: r.name,
                    sku: r.sku,
                    warehouse: r.warehouse,
                    onHand: r.onHand,
                    reserved: r.reserved,
                    available: r.available,
                    reorderLevel: r.reorderLevel,
                  }))
                )
              }
            >
              <Download size={15} />
              Export
            </Button>
            <Button>
              <PackagePlus size={15} />
              Stock adjustment
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Units on hand", value: formatNumber(totalUnits), tone: "text-slate-900" },
          { label: "Low stock items", value: String(lowCount), tone: "text-amber-600" },
          { label: "Out of stock", value: String(outCount), tone: "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="py-4">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className={cn("mt-1 text-xl font-semibold tracking-tight", s.tone)}>
                {s.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-1 border-b border-slate-100 px-5 py-3">
          {["All", ...warehouseList].map((w) => (
            <button
              key={w}
              onClick={() => setWarehouse(w)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                warehouse === w
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {w}
            </button>
          ))}
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Warehouse</Th>
              <Th className="text-right">On hand</Th>
              <Th className="text-right">Reserved</Th>
              <Th className="text-right">Available</Th>
              <Th className="text-right">Reorder level</Th>
              <Th>Health</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <Td colSpan={7} className="py-12 text-center text-slate-400">
                  Loading stock…
                </Td>
              </tr>
            )}
            {!loading &&
              filtered.map((r) => {
                const pct =
                  r.reorderLevel > 0
                    ? Math.min(100, Math.max(0, (r.onHand / (r.reorderLevel * 3)) * 100))
                    : 100;
                return (
                  <Tr key={`${r.productId}-${r.warehouse}`}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                          {r.image}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{r.name}</p>
                          <p className="font-mono text-xs text-slate-400">
                            {r.sku}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{r.warehouse}</Td>
                    <Td className="text-right font-medium text-slate-900">
                      {formatNumber(r.onHand)}
                    </Td>
                    <Td className="text-right text-slate-600">
                      {formatNumber(r.reserved)}
                    </Td>
                    <Td className="text-right font-medium text-slate-900">
                      {formatNumber(r.available)}
                    </Td>
                    <Td className="text-right text-slate-600">
                      {formatNumber(r.reorderLevel)}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              r.onHand <= 0
                                ? "bg-red-500"
                                : r.onHand <= r.reorderLevel
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {r.onHand <= 0 ? (
                          <Badge tone="red">Out</Badge>
                        ) : r.onHand <= r.reorderLevel ? (
                          <Badge tone="amber">Low</Badge>
                        ) : (
                          <Badge tone="green">OK</Badge>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            {!loading && filtered.length === 0 && (
              <tr>
                <Td colSpan={7} className="py-12 text-center text-slate-400">
                  No stock records yet — add products with opening stock.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
