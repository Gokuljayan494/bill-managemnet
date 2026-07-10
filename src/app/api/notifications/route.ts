import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { Invoice } from "@/server/models/Invoice";
import { Product } from "@/server/models/Product";
import { getSession, unauthorized } from "@/server/session";
import { serializeProduct } from "@/server/serializers";
import { formatCurrency } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Live notifications derived from data: overdue invoices + stock alerts. */
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const [overdue, products] = await Promise.all([
    Invoice.find({
      orgId: session.orgId,
      status: { $in: ["pending", "partially-paid"] },
      balance: { $gt: 0 },
      dueDate: { $lt: new Date() },
    })
      .select("number customer.name balance dueDate")
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
    Product.find({ orgId: session.orgId, status: "active" }).lean(),
  ]);

  const stockAlerts = products
    .map(serializeProduct)
    .filter((p) => p.stock <= p.reorderLevel)
    .slice(0, 10);

  const items = [
    ...overdue.map((i: any) => ({
      id: `inv-${i._id}`,
      type: "overdue" as const,
      title: `${i.number} is overdue`,
      detail: `${i.customer?.name ?? ""} owes ${formatCurrency(i.balance)}`,
      href: "/invoices",
    })),
    ...stockAlerts.map((p) => ({
      id: `stk-${p.id}`,
      type: p.stock <= 0 ? ("out-of-stock" as const) : ("low-stock" as const),
      title: p.stock <= 0 ? `${p.name} is out of stock` : `${p.name} is running low`,
      detail:
        p.stock <= 0
          ? `${p.warehouse} · reorder now`
          : `${p.stock} ${p.unit} left · reorder at ${p.reorderLevel}`,
      href: "/inventory",
    })),
  ];

  return NextResponse.json({ items });
}
