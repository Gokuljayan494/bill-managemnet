import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Customer } from "@/server/models/Customer";
import { getSession, unauthorized } from "@/server/session";
import { serializeCustomer } from "@/server/serializers";
import { customerUpdateSchema, parseBody } from "@/server/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const { id } = await params;
  const customer = await Customer.findOne({
    _id: id,
    orgId: session.orgId,
  }).lean();
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: serializeCustomer(customer), raw: customer });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, customerUpdateSchema);
  if (!parsed.ok) return parsed.response;

  await db();

  const { id } = await params;
  const customer = await Customer.findOneAndUpdate(
    { _id: id, orgId: session.orgId },
    { $set: parsed.data },
    { new: true }
  ).lean();
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: serializeCustomer(customer) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const { id } = await params;
  const res = await Customer.deleteOne({ _id: id, orgId: session.orgId });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
