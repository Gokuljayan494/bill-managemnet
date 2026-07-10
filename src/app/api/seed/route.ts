import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { Product } from "@/server/models/Product";
import { Customer } from "@/server/models/Customer";
import { getSession, unauthorized } from "@/server/session";
import { products as sampleProducts } from "@/data/products";
import { customers as sampleCustomers } from "@/data/customers";

/** Load sample catalog data into the current org (only when it's empty). */
export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const existing = await Product.countDocuments({ orgId: session.orgId });
  if (existing > 0) {
    return NextResponse.json(
      { error: "This workspace already has products" },
      { status: 400 }
    );
  }

  await Product.insertMany(
    sampleProducts.map((p) => ({
      orgId: session.orgId,
      name: p.name,
      category: p.category,
      sku: p.sku,
      hsn: p.hsn,
      baseUnit: p.unit,
      sellingUnit: p.unit,
      prices: { retail: p.retailPrice, wholesale: p.wholesalePrice },
      purchaseCost: p.purchaseCost,
      gstRate: p.gstRate,
      images: [{ url: p.image, publicId: "" }],
      variants: (p.variants ?? []).map((name) => ({ name })),
      stock: [
        {
          warehouse: p.warehouse,
          onHand: p.stock,
          reserved: p.reserved,
          reorderLevel: p.reorderLevel,
        },
      ],
      status: p.status,
    }))
  );

  await Customer.insertMany(
    sampleCustomers.map((c) => ({
      orgId: session.orgId,
      name: c.name,
      type: c.type,
      contact: c.contact,
      email: c.email,
      phone: c.phone,
      gstin: c.gstin ?? "",
    }))
  );

  return NextResponse.json({
    ok: true,
    products: sampleProducts.length,
    customers: sampleCustomers.length,
  });
}
