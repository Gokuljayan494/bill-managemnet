import mongoose, { Schema, InferSchemaType } from "mongoose";

const InvoiceSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    number: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    // snapshot so the invoice stays correct even if the customer is edited later
    customer: {
      name: { type: String, required: true },
      type: { type: String, enum: ["B2B", "B2C"], default: "B2C" },
      gstin: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paymentTerms: { type: String, default: "Net 15" },

    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true },
        sku: { type: String, default: "" },
        hsn: { type: String, default: "" },
        variant: { type: String, default: "" },
        unit: { type: String, default: "Piece" },
        qty: { type: Number, required: true },
        freeQty: { type: Number, default: 0 },
        rate: { type: Number, required: true },
        discountPct: { type: Number, default: 0 },
        gstRate: { type: Number, default: 18 },
        warehouse: { type: String, default: "" },
        note: { type: String, default: "" },
        taxable: { type: Number, default: 0 },
        gstAmount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
    ],

    totals: {
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      roundOff: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },

    payments: [
      {
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        mode: {
          type: String,
          enum: ["cash", "upi", "bank", "card", "cheque", "other"],
          default: "cash",
        },
        reference: { type: String, default: "" },
      },
    ],
    balance: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "pending", "partially-paid", "paid", "overdue", "void"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

InvoiceSchema.index({ orgId: 1, number: 1 }, { unique: true });
InvoiceSchema.index({ orgId: 1, date: -1 });

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema>;

export const Invoice =
  mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
