import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { Product } from "@/server/models/Product";
import { getSession, unauthorized } from "@/server/session";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** One row per product per warehouse, for the inventory screen. */
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const products = await Product.find({ orgId: session.orgId })
    .select("name sku images stock")
    .lean();

  const rows = products.flatMap((p: any) =>
    (p.stock ?? []).map((s: any) => ({
      productId: String(p._id),
      name: p.name,
      sku: p.sku ?? "",
      image: p.images?.[0]?.url || "📦",
      warehouse: s.warehouse,
      onHand: s.onHand ?? 0,
      reserved: s.reserved ?? 0,
      available: (s.onHand ?? 0) - (s.reserved ?? 0),
      reorderLevel: s.reorderLevel ?? 0,
    }))
  );

  const warehouses = [...new Set(rows.map((r) => r.warehouse))].sort();

  return NextResponse.json({ rows, warehouses });
}
