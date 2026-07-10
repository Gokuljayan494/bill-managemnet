import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Product } from "@/server/models/Product";
import { Customer } from "@/server/models/Customer";
import { Invoice } from "@/server/models/Invoice";
import { getSession, unauthorized } from "@/server/session";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Global search across products, customers and invoices (top 5 each). */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  if (!q) return NextResponse.json({ products: [], customers: [], invoices: [] });

  await db();
  const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [products, customers, invoices] = await Promise.all([
    Product.find({ orgId: session.orgId, $or: [{ name: rx }, { sku: rx }] })
      .select("name sku images prices.retail")
      .limit(5)
      .lean(),
    Customer.find({ orgId: session.orgId, $or: [{ name: rx }, { phone: rx }] })
      .select("name type")
      .limit(5)
      .lean(),
    Invoice.find({
      orgId: session.orgId,
      $or: [{ number: rx }, { "customer.name": rx }],
    })
      .select("number customer.name totals.grandTotal status")
      .sort({ date: -1 })
      .limit(5)
      .lean(),
  ]);

  return NextResponse.json({
    products: products.map((p: any) => ({
      id: String(p._id),
      name: p.name,
      sku: p.sku ?? "",
      image: p.images?.[0]?.url || "📦",
      price: p.prices?.retail ?? 0,
    })),
    customers: customers.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      type: c.type,
    })),
    invoices: invoices.map((i: any) => ({
      id: String(i._id),
      number: i.number,
      customer: i.customer?.name ?? "",
      amount: i.totals?.grandTotal ?? 0,
      status: i.status,
    })),
  });
}
