import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Invoice } from "@/server/models/Invoice";
import { Customer } from "@/server/models/Customer";
import { getSession, unauthorized } from "@/server/session";
import { serializeInvoice } from "@/server/serializers";
import { applyInvoiceStock, buildInvoiceItems, BuiltItem } from "@/server/billing";
import { invoiceCreateSchema, parseBody } from "@/server/validation";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const { id } = await params;
  const invoice = await Invoice.findOne({
    _id: id,
    orgId: session.orgId,
  }).lean();
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: serializeInvoice(invoice), raw: invoice });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, invoiceCreateSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  await db();

  const { id } = await params;
  const invoice = await Invoice.findOne({ _id: id, orgId: session.orgId });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const built = await buildInvoiceItems(session.orgId, input.items);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }
  const { items, totals } = built;

  const paidSoFar = invoice.payments.reduce(
    (s: number, p: any) => s + p.amount,
    0
  );
  if (paidSoFar > totals.grandTotal) {
    return NextResponse.json(
      {
        error: `₹${paidSoFar} is already paid on this invoice — the new total cannot be lower than that`,
      },
      { status: 400 }
    );
  }

  const wasDraft = invoice.status === "draft";
  const isDraft = input.status === "draft" && paidSoFar === 0;

  // customer (may have changed)
  let customerSnapshot = {
    name: input.customerName?.trim() ?? invoice.customer.name,
    type: (input.customerType ?? invoice.customer.type) as "B2B" | "B2C",
    gstin: "",
    email: "",
    phone: "",
  };
  let newCustomerId: string | undefined;
  if (input.customerId) {
    const customer = await Customer.findOne({
      _id: input.customerId,
      orgId: session.orgId,
    }).lean();
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 400 });
    }
    newCustomerId = String(customer._id);
    customerSnapshot = {
      name: customer.name,
      type: customer.type,
      gstin: customer.gstin ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    };
  }

  // 1. revert old effects (stock + customer balance) unless it was a draft
  if (!wasDraft) {
    await applyInvoiceStock(
      session.orgId,
      invoice.items as unknown as BuiltItem[],
      1,
      invoice._id,
      `edit ${invoice.number} (reverted)`
    );
    if (invoice.customerId) {
      await Customer.updateOne(
        { _id: invoice.customerId },
        {
          $inc: {
            balance: -invoice.balance,
            totalBusiness: -(invoice.totals?.grandTotal ?? 0),
          },
        }
      );
    }
  }

  // 2. apply new values
  const date = input.date ?? invoice.date;
  const termDays = Number(/net\s*(\d+)/i.exec(input.paymentTerms)?.[1] ?? 0);
  const dueDate =
    input.dueDate ?? new Date(date.getTime() + termDays * 24 * 60 * 60 * 1000);

  const balance = totals.grandTotal - paidSoFar;
  const status = isDraft
    ? "draft"
    : balance <= 0
      ? "paid"
      : paidSoFar > 0
        ? "partially-paid"
        : "pending";

  invoice.set({
    customerId: newCustomerId,
    customer: customerSnapshot,
    date,
    dueDate,
    paymentTerms: input.paymentTerms,
    items,
    totals,
    balance,
    status,
  });
  await invoice.save();

  if (!isDraft) {
    await applyInvoiceStock(
      session.orgId,
      items,
      -1,
      invoice._id,
      `edit ${invoice.number}`
    );
    if (newCustomerId) {
      await Customer.updateOne(
        { _id: newCustomerId },
        { $inc: { balance, totalBusiness: totals.grandTotal } }
      );
    }
  }

  return NextResponse.json({ item: serializeInvoice(invoice.toObject()) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const { id } = await params;
  const invoice = await Invoice.findOne({ _id: id, orgId: session.orgId });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (invoice.payments.length > 0) {
    return NextResponse.json(
      { error: "This invoice has payments recorded — it cannot be deleted" },
      { status: 400 }
    );
  }

  if (invoice.status !== "draft") {
    await applyInvoiceStock(
      session.orgId,
      invoice.items as unknown as BuiltItem[],
      1,
      invoice._id,
      `delete ${invoice.number}`
    );
    if (invoice.customerId) {
      await Customer.updateOne(
        { _id: invoice.customerId },
        {
          $inc: {
            balance: -invoice.balance,
            totalBusiness: -(invoice.totals?.grandTotal ?? 0),
          },
        }
      );
    }
  }

  await Invoice.deleteOne({ _id: invoice._id });
  return NextResponse.json({ ok: true });
}
