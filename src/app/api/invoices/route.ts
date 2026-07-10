import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Invoice } from "@/server/models/Invoice";
import { Customer } from "@/server/models/Customer";
import { Organization } from "@/server/models/Organization";
import { nextSeq } from "@/server/models/Counter";
import { getSession, unauthorized } from "@/server/session";
import { serializeInvoice } from "@/server/serializers";
import { applyInvoiceStock, buildInvoiceItems } from "@/server/billing";
import {
  invoiceCreateSchema,
  listQuerySchema,
  parseBody,
  parseQuery,
} from "@/server/validation";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = parseQuery(req, listQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { q, status, page, limit } = parsed.data;

  await db();

  const filter: Record<string, unknown> = { orgId: session.orgId };
  if (status && status !== "all") filter.status = status;
  if (q) {
    filter.$or = [
      { number: { $regex: q, $options: "i" } },
      { "customer.name": { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return NextResponse.json({
    items: items.map(serializeInvoice),
    total,
    page,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, invoiceCreateSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  await db();

  // Customer: existing id, or inline details (walk-in B2C)
  let customerSnapshot = {
    name: input.customerName?.trim() ?? "",
    type: (input.customerType ?? "B2C") as "B2B" | "B2C",
    gstin: "",
    email: "",
    phone: "",
  };
  let customerId: string | undefined;
  if (input.customerId) {
    const customer = await Customer.findOne({
      _id: input.customerId,
      orgId: session.orgId,
    }).lean();
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 400 });
    }
    customerId = String(customer._id);
    customerSnapshot = {
      name: customer.name,
      type: customer.type,
      gstin: customer.gstin ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    };
  }

  const built = await buildInvoiceItems(session.orgId, input.items);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }
  const { items, totals } = built;

  const isDraft = input.status === "draft";
  const received = isDraft ? 0 : Math.min(input.amountReceived, totals.grandTotal);
  if (!isDraft && input.amountReceived > totals.grandTotal) {
    return NextResponse.json(
      { error: "Amount received cannot exceed the invoice total" },
      { status: 400 }
    );
  }

  const org = await Organization.findById(session.orgId).lean();
  const prefix = org?.settings?.invoicePrefix || "INV-";
  const seq = await nextSeq(session.orgId, "invoice");
  const number = `${prefix}${String(seq).padStart(4, "0")}`;

  const date = input.date ?? new Date();
  const termDays = Number(/net\s*(\d+)/i.exec(input.paymentTerms)?.[1] ?? 0);
  const dueDate =
    input.dueDate ?? new Date(date.getTime() + termDays * 24 * 60 * 60 * 1000);

  const balance = totals.grandTotal - received;
  const status = isDraft
    ? "draft"
    : balance <= 0
      ? "paid"
      : received > 0
        ? "partially-paid"
        : "pending";

  const invoice = await Invoice.create({
    orgId: session.orgId,
    number,
    customerId,
    customer: customerSnapshot,
    date,
    dueDate,
    paymentTerms: input.paymentTerms,
    items,
    totals,
    payments:
      received > 0
        ? [{ date, amount: received, mode: input.paymentMode, reference: "" }]
        : [],
    balance,
    status,
  });

  if (!isDraft) {
    await applyInvoiceStock(session.orgId, items, -1, invoice._id, number);
    if (customerId) {
      await Customer.updateOne(
        { _id: customerId },
        { $inc: { balance, totalBusiness: totals.grandTotal } }
      );
    }
  }

  return NextResponse.json(
    { item: serializeInvoice(invoice.toObject()) },
    { status: 201 }
  );
}
