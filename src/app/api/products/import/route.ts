import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { Product } from "@/server/models/Product";
import { getSession, unauthorized } from "@/server/session";
import { parseBody } from "@/server/validation";

const importRowSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(200),
  sku: z.string().trim().max(100).default(""),
  category: z.string().trim().max(100).default("General"),
  hsn: z.string().trim().max(20).default(""),
  unit: z.string().trim().max(50).default("Piece"),
  retail: z.coerce.number().min(0).max(100_000_000).default(0),
  wholesale: z.coerce.number().min(0).max(100_000_000).default(0),
  purchasecost: z.coerce.number().min(0).max(100_000_000).default(0),
  gstrate: z.coerce.number().min(0).max(100).default(18),
  stock: z.coerce.number().min(0).max(1_000_000).default(0),
  reorderlevel: z.coerce.number().min(0).max(1_000_000).default(0),
  warehouse: z.string().trim().max(100).default("Main"),
});

const importSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1, "The file has no data rows")
    .max(1000, "Import at most 1000 rows at a time"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, importSchema);
  if (!parsed.ok) return parsed.response;

  await db();

  const docs: Record<string, unknown>[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.rows.forEach((raw, index) => {
    const result = importRowSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      errors.push({
        row: index + 2, // +2: 1-based + header row
        message: `${issue.path.join(".")}: ${issue.message}`,
      });
      return;
    }
    const row = result.data;
    docs.push({
      orgId: session.orgId,
      name: row.name,
      sku: row.sku,
      category: row.category || "General",
      hsn: row.hsn,
      baseUnit: row.unit || "Piece",
      sellingUnit: row.unit || "Piece",
      prices: { retail: row.retail, wholesale: row.wholesale },
      purchaseCost: row.purchasecost,
      gstRate: row.gstrate,
      stock: [
        {
          warehouse: row.warehouse || "Main",
          onHand: row.stock,
          reorderLevel: row.reorderlevel,
        },
      ],
      status: "active",
    });
  });

  if (docs.length > 0) await Product.insertMany(docs);

  return NextResponse.json({
    created: docs.length,
    failed: errors.length,
    errors: errors.slice(0, 20),
  });
}
