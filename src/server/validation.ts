import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

/* ---------- shared building blocks ---------- */

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const money = z.coerce
  .number()
  .min(0, "Cannot be negative")
  .max(100_000_000, "Amount is too large");

const quantity = z.coerce
  .number()
  .min(0, "Cannot be negative")
  .max(1_000_000, "Quantity is too large");

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const gstinRe = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .refine((v) => v === "" || emailRe.test(v), "Enter a valid email address")
  .default("");

const optionalGstin = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (v) => v === "" || gstinRe.test(v),
    "Enter a valid 15-character GSTIN (e.g. 33AABCS1429B1ZK)"
  )
  .default("");

const shortText = (max: number) => z.string().trim().max(max).default("");

/* ---------- auth ---------- */

export const otpSendSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .regex(emailRe, "Enter a valid email address"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(100),
  businessName: z
    .string()
    .trim()
    .min(1, "Store / business name is required")
    .max(150),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .regex(emailRe, "Enter a valid email address"),
  phone: z.string().trim().max(25).default(""),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  code: z.string().trim().regex(/^\d{6}$/, "The code must be 6 digits"),
});

export const passwordLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .regex(emailRe, "Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(100),
});

export const orgSettingsSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(150).optional(),
  settings: z
    .object({
      gstin: optionalGstin,
      address: shortText(500),
      phone: shortText(25),
      email: optionalEmail,
      currency: z.string().trim().max(10),
      defaultGstRate: z.coerce.number().min(0).max(100),
      invoicePrefix: z.string().trim().max(20),
      paymentTerms: z.string().trim().max(50),
    })
    .partial()
    .optional(),
});

export const otpVerifySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .regex(emailRe, "Enter a valid email address"),
  code: z.string().trim().regex(/^\d{6}$/, "The code must be 6 digits"),
});

/* ---------- list queries ---------- */

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
  type: z.enum(["B2B", "B2C"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

/* ---------- products ---------- */

const conversionSchema = z.object({
  from: z.string().trim().min(1, "Unit is required").max(50),
  qty: z.coerce
    .number()
    .positive("Conversion quantity must be above zero")
    .max(1_000_000),
  to: z.string().trim().min(1, "Unit is required").max(50),
});

const variantSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required").max(120),
  price: money.default(0),
  sku: shortText(100),
  stock: quantity.default(0),
});

const stockEntrySchema = z.object({
  warehouse: z.string().trim().min(1, "Warehouse name is required").max(100),
  onHand: z.coerce.number().min(-1_000_000).max(1_000_000).default(0),
  reserved: quantity.default(0),
  reorderLevel: quantity.default(0),
  minStock: quantity.default(0),
  maxStock: quantity.default(0),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  description: z.string().max(10_000).default(""),
  shortDescription: shortText(500),
  internalNotes: shortText(2_000),

  sku: shortText(100),
  barcode: shortText(100),
  hsn: shortText(20),
  itemCode: shortText(100),
  internalCode: shortText(100),
  mpn: shortText(100),

  category: z.string().trim().max(100).default("General"),
  brand: shortText(100),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).default([]),

  baseUnit: z.string().trim().min(1).max(50).default("Piece"),
  sellingUnit: shortText(50),
  conversions: z.array(conversionSchema).max(20).default([]),

  prices: z
    .object({
      retail: money.default(0),
      wholesale: money.default(0),
      distributor: money.default(0),
      dealer: money.default(0),
      online: money.default(0),
    })
    .default({ retail: 0, wholesale: 0, distributor: 0, dealer: 0, online: 0 }),
  purchaseCost: money.default(0),
  gstRate: z.coerce
    .number()
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%")
    .default(18),
  taxInclusive: z.boolean().default(false),

  images: z
    .array(
      z.object({
        url: z.string().trim().max(500),
        publicId: shortText(200),
      })
    )
    .max(20)
    .default([]),

  variants: z.array(variantSchema).max(200).default([]),
  stock: z.array(stockEntrySchema).max(50).default([]),

  tracking: z
    .object({
      batch: z.boolean().default(false),
      expiry: z.boolean().default(false),
      serial: z.boolean().default(false),
      lot: z.boolean().default(false),
    })
    .default({ batch: false, expiry: false, serial: false, lot: false }),

  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const productUpdateSchema = productCreateSchema.partial();

/* ---------- customers ---------- */

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(200),
  type: z.enum(["B2B", "B2C"]).default("B2C"),
  contact: shortText(200),
  email: optionalEmail,
  phone: shortText(25),
  gstin: optionalGstin,
  billingAddress: shortText(500),
  shippingAddress: shortText(500),
  creditLimit: money.default(0),
});

export const customerUpdateSchema = customerCreateSchema.partial();

/* ---------- invoices ---------- */

const invoiceItemSchema = z.object({
  productId: objectId,
  variant: shortText(120),
  unit: shortText(50),
  qty: z.coerce
    .number()
    .positive("Quantity must be above zero")
    .max(1_000_000, "Quantity is too large"),
  freeQty: quantity.default(0),
  rate: money,
  discountPct: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .default(0),
  warehouse: shortText(100),
  note: shortText(500),
});

export const invoiceCreateSchema = z
  .object({
    customerId: objectId.optional(),
    customerName: z.string().trim().max(200).optional(),
    customerType: z.enum(["B2B", "B2C"]).optional(),
    date: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    paymentTerms: z.string().trim().max(50).default("Net 15"),
    status: z.enum(["pending", "draft"]).default("pending"),
    items: z
      .array(invoiceItemSchema)
      .min(1, "Add at least one line item")
      .max(200, "An invoice can have at most 200 line items"),
    // payment collected at billing time (e.g. cash sale)
    amountReceived: z.coerce
      .number()
      .min(0, "Amount received cannot be negative")
      .max(1_000_000_000)
      .default(0),
    paymentMode: z
      .enum(["cash", "upi", "bank", "card", "cheque", "other"])
      .default("cash"),
  })
  .refine((d) => d.customerId || d.customerName?.trim(), {
    message: "Select or enter a customer",
    path: ["customerId"],
  });

/* ---------- payments ---------- */

export const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Payment amount must be above zero")
    .max(1_000_000_000, "Amount is too large"),
  mode: z.enum(["cash", "upi", "bank", "card", "cheque", "other"]).default("cash"),
  reference: shortText(100),
  date: z.coerce.date().optional(),
});

/* ---------- parse helpers ---------- */

type ParseOk<T> = { ok: true; data: T };
type ParseFail = { ok: false; response: NextResponse };

function fail(error: z.ZodError): ParseFail {
  const issue = error.issues[0];
  const field = issue.path.join(".");
  const message =
    issue.code === "invalid_type" && field
      ? `${field} is invalid or missing`
      : issue.message;
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: message,
        field: field || undefined,
        issues: error.issues.slice(0, 10).map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    ),
  };
}

/** Validate a JSON request body. Unknown fields are stripped automatically. */
export async function parseBody<S extends z.ZodType>(
  req: NextRequest,
  schema: S
): Promise<ParseOk<z.infer<S>> | ParseFail> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const result = schema.safeParse(json);
  if (!result.success) return fail(result.error);
  return { ok: true, data: result.data };
}

/** Validate URL query parameters. */
export function parseQuery<S extends z.ZodType>(
  req: NextRequest,
  schema: S
): ParseOk<z.infer<S>> | ParseFail {
  const result = schema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!result.success) return fail(result.error);
  return { ok: true, data: result.data };
}
