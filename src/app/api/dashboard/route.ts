import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { db } from "@/server/db";
import { Invoice } from "@/server/models/Invoice";
import { Product } from "@/server/models/Product";
import { getSession, unauthorized } from "@/server/session";
import { serializeInvoice, serializeProduct } from "@/server/serializers";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  // aggregate() skips Mongoose casting, so the org id must be a real ObjectId
  const orgId = new Types.ObjectId(session.orgId);

  const [monthAgg, outstandingAgg, trendAgg, recentInvoices, products] =
    await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            orgId,
            status: { $ne: "draft" },
            date: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$totals.grandTotal" } } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            orgId,
            status: { $nin: ["draft", "void"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$balance" } } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            orgId,
            status: { $ne: "draft" },
            date: { $gte: yearAgo },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$date" }, m: { $month: "$date" } },
            total: { $sum: "$totals.grandTotal" },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      Invoice.find({ orgId: session.orgId })
        .sort({ date: -1 })
        .limit(5)
        .lean(),
      Product.find({ orgId: session.orgId }).lean(),
    ]);

  // Build a continuous 12-month revenue series (zeros where no sales)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const byKey = new Map(
    trendAgg.map((t: any) => [`${t._id.y}-${t._id.m}`, t.total])
  );
  const trend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trend.push({
      month: monthNames[d.getMonth()],
      total: byKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`) ?? 0,
    });
  }

  const serialized = products.map(serializeProduct);
  const lowStock = serialized.filter(
    (p) => p.status === "active" && p.stock <= p.reorderLevel
  );

  return NextResponse.json({
    kpis: {
      revenueThisMonth: monthAgg[0]?.total ?? 0,
      outstanding: outstandingAgg[0]?.total ?? 0,
      lowStockCount: lowStock.length,
      productCount: products.length,
    },
    trend,
    recentInvoices: recentInvoices.map(serializeInvoice),
    stockAlerts: lowStock.slice(0, 5),
  });
}
