import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Customer } from "@/server/models/Customer";
import { getSession, unauthorized } from "@/server/session";
import { serializeCustomer } from "@/server/serializers";
import {
  customerCreateSchema,
  listQuerySchema,
  parseBody,
  parseQuery,
} from "@/server/validation";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = parseQuery(req, listQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { q, type } = parsed.data;

  await db();

  const filter: Record<string, unknown> = { orgId: session.orgId };
  if (type) filter.type = type;
  if (q) filter.name = { $regex: q, $options: "i" };

  const items = await Customer.find(filter).sort({ name: 1 }).limit(500).lean();
  return NextResponse.json({ items: items.map(serializeCustomer) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, customerCreateSchema);
  if (!parsed.ok) return parsed.response;

  await db();

  const customer = await Customer.create({
    ...parsed.data,
    contact: parsed.data.contact || parsed.data.name,
    orgId: session.orgId,
  });
  return NextResponse.json(
    { item: serializeCustomer(customer.toObject()) },
    { status: 201 }
  );
}
