import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Product } from "@/server/models/Product";
import { getSession, unauthorized } from "@/server/session";
import { serializeProduct } from "@/server/serializers";
import { parseBody, productUpdateSchema } from "@/server/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const { id } = await params;
  const product = await Product.findOne({
    _id: id,
    orgId: session.orgId,
  }).lean();
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: serializeProduct(product), raw: product });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, productUpdateSchema);
  if (!parsed.ok) return parsed.response;

  await db();

  const { id } = await params;
  const product = await Product.findOneAndUpdate(
    { _id: id, orgId: session.orgId },
    { $set: parsed.data },
    { new: true }
  ).lean();
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: serializeProduct(product) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const { id } = await params;
  const res = await Product.deleteOne({ _id: id, orgId: session.orgId });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
