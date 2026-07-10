import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Product } from "@/server/models/Product";
import { getSession, unauthorized } from "@/server/session";
import { serializeProduct } from "@/server/serializers";
import {
  listQuerySchema,
  parseBody,
  parseQuery,
  productCreateSchema,
} from "@/server/validation";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = parseQuery(req, listQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { q, category, page, limit } = parsed.data;

  await db();

  const filter: Record<string, unknown> = { orgId: session.orgId };
  if (category && category !== "All") filter.category = category;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { sku: { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return NextResponse.json({
    items: items.map(serializeProduct),
    total,
    page,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, productCreateSchema);
  if (!parsed.ok) return parsed.response;

  await db();

  const product = await Product.create({
    ...parsed.data,
    orgId: session.orgId,
  });
  return NextResponse.json(
    { item: serializeProduct(product.toObject()) },
    { status: 201 }
  );
}
