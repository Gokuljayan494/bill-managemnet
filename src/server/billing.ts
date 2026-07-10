import { Product } from "@/server/models/Product";
import { StockMovement } from "@/server/models/StockMovement";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BuiltItem {
  productId: any;
  name: string;
  sku: string;
  hsn: string;
  variant: string;
  unit: string;
  qty: number;
  freeQty: number;
  rate: number;
  discountPct: number;
  gstRate: number;
  warehouse: string;
  note: string;
  taxable: number;
  gstAmount: number;
  total: number;
}

interface LineInput {
  productId: string;
  variant: string;
  unit: string;
  qty: number;
  freeQty: number;
  rate: number;
  discountPct: number;
  warehouse: string;
  note: string;
}

/** Price every line from the catalog and total the invoice. All money is computed here, never trusted from the client. */
export async function buildInvoiceItems(
  orgId: string,
  lines: LineInput[]
): Promise<
  | { ok: true; items: BuiltItem[]; totals: { subtotal: number; discount: number; gst: number; roundOff: number; grandTotal: number } }
  | { ok: false; error: string }
> {
  const products = await Product.find({
    _id: { $in: lines.map((l) => l.productId) },
    orgId,
  }).lean();
  const byId = new Map(products.map((p: any) => [String(p._id), p]));

  let subtotal = 0;
  let discountTotal = 0;
  let gstTotal = 0;
  const items: BuiltItem[] = [];

  for (const line of lines) {
    const product: any = byId.get(line.productId);
    if (!product) {
      return {
        ok: false,
        error: "One of the products no longer exists — refresh and try again",
      };
    }

    const gross = line.qty * line.rate;
    const discount = gross * (line.discountPct / 100);
    const taxable = gross - discount;
    const gstAmount = taxable * ((product.gstRate ?? 18) / 100);

    subtotal += gross;
    discountTotal += discount;
    gstTotal += gstAmount;

    items.push({
      productId: product._id,
      name: product.name,
      sku: product.sku ?? "",
      hsn: product.hsn ?? "",
      variant: line.variant,
      unit: line.unit || product.baseUnit || "Piece",
      qty: line.qty,
      freeQty: line.freeQty,
      rate: line.rate,
      discountPct: line.discountPct,
      gstRate: product.gstRate ?? 18,
      warehouse: line.warehouse,
      note: line.note,
      taxable,
      gstAmount,
      total: taxable + gstAmount,
    });
  }

  const rawTotal = subtotal - discountTotal + gstTotal;
  const grandTotal = Math.round(rawTotal);

  return {
    ok: true,
    items,
    totals: {
      subtotal,
      discount: discountTotal,
      gst: gstTotal,
      roundOff: grandTotal - rawTotal,
      grandTotal,
    },
  };
}

/**
 * Move stock for invoice items and write the ledger.
 * direction -1 = sale (deduct), +1 = reversal (restore).
 */
export async function applyInvoiceStock(
  orgId: string,
  items: BuiltItem[],
  direction: -1 | 1,
  refId: any,
  note: string
) {
  for (const item of items) {
    const change = direction * (item.qty + item.freeQty);
    const warehouse = item.warehouse || "Main";

    const updated = await Product.updateOne(
      { _id: item.productId, orgId, "stock.warehouse": warehouse },
      { $inc: { "stock.$.onHand": change } }
    );
    if (updated.matchedCount === 0) {
      await Product.updateOne(
        { _id: item.productId, orgId },
        { $push: { stock: { warehouse, onHand: change } } }
      );
    }
    await StockMovement.create({
      orgId,
      productId: item.productId,
      variant: item.variant,
      warehouse,
      type: direction === -1 ? "sale" : "adjustment",
      qty: change,
      refType: "invoice",
      refId,
      note,
    });
  }
}
