import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Invoice } from "@/server/models/Invoice";
import { Customer } from "@/server/models/Customer";
import { getSession, unauthorized } from "@/server/session";
import { serializeInvoice } from "@/server/serializers";
import { parseBody, paymentSchema } from "@/server/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, paymentSchema);
  if (!parsed.ok) return parsed.response;
  const { amount, mode, reference, date } = parsed.data;

  await db();

  const { id } = await params;

  const invoice = await Invoice.findOne({ _id: id, orgId: session.orgId });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (amount > invoice.balance) {
    return NextResponse.json(
      { error: "Payment exceeds outstanding balance" },
      { status: 400 }
    );
  }

  invoice.payments.push({
    date: date ?? new Date(),
    amount,
    mode,
    reference,
  });
  invoice.balance -= amount;
  invoice.status = invoice.balance === 0 ? "paid" : "partially-paid";
  await invoice.save();

  if (invoice.customerId) {
    await Customer.updateOne(
      { _id: invoice.customerId },
      { $inc: { balance: -amount } }
    );
  }

  return NextResponse.json({ item: serializeInvoice(invoice.toObject()) });
}

/** Clear all payments — marks the invoice unpaid again. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const { id } = await params;
  const invoice = await Invoice.findOne({ _id: id, orgId: session.orgId });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paid = invoice.payments.reduce(
    (s: number, p: { amount: number }) => s + p.amount,
    0
  );
  if (paid === 0) {
    return NextResponse.json({ item: serializeInvoice(invoice.toObject()) });
  }

  invoice.payments = [];
  invoice.balance = invoice.totals?.grandTotal ?? 0;
  if (invoice.status !== "draft") invoice.status = "pending";
  await invoice.save();

  if (invoice.customerId) {
    await Customer.updateOne(
      { _id: invoice.customerId },
      { $inc: { balance: paid } }
    );
  }

  return NextResponse.json({ item: serializeInvoice(invoice.toObject()) });
}
