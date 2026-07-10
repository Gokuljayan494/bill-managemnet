/* Map Mongo documents to the flat shapes the UI components expect. */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function serializeProduct(p: any) {
  const stockEntries: any[] = p.stock ?? [];
  const totalOnHand = stockEntries.reduce((s, w) => s + (w.onHand ?? 0), 0);
  const totalReserved = stockEntries.reduce((s, w) => s + (w.reserved ?? 0), 0);
  const first = stockEntries[0];

  return {
    id: String(p._id),
    name: p.name,
    category: p.category || "Uncategorised",
    sku: p.sku || "",
    hsn: p.hsn || "",
    unit: p.sellingUnit || p.baseUnit || "Piece",
    retailPrice: p.prices?.retail ?? 0,
    wholesalePrice: p.prices?.wholesale ?? 0,
    purchaseCost: p.purchaseCost ?? 0,
    gstRate: p.gstRate ?? 18,
    stock: totalOnHand,
    reserved: totalReserved,
    reorderLevel: first?.reorderLevel ?? 0,
    warehouse: first?.warehouse ?? "Main",
    status: p.status,
    image: p.images?.[0]?.url || "📦",
    variants: (p.variants ?? []).map((v: any) => v.name).filter(Boolean),
  };
}

export function serializeInvoice(inv: any) {
  const balance = inv.balance ?? 0;
  let status: string = inv.status;
  if (
    (status === "pending" || status === "partially-paid") &&
    balance > 0 &&
    new Date(inv.dueDate).getTime() < Date.now()
  ) {
    status = "overdue";
  }
  return {
    id: String(inv._id),
    number: inv.number,
    customer: inv.customer?.name ?? "",
    customerType: inv.customer?.type ?? "B2C",
    date: inv.date?.toISOString?.() ?? inv.date,
    dueDate: inv.dueDate?.toISOString?.() ?? inv.dueDate,
    amount: inv.totals?.grandTotal ?? 0,
    balance,
    status,
    items: inv.items?.length ?? 0,
  };
}

export function serializeCustomer(c: any) {
  return {
    id: String(c._id),
    name: c.name,
    type: c.type,
    contact: c.contact || c.name,
    email: c.email || "",
    phone: c.phone || "",
    gstin: c.gstin || undefined,
    billingAddress: c.billingAddress || "",
    balance: c.balance ?? 0,
    totalBusiness: c.totalBusiness ?? 0,
    since: c.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}
