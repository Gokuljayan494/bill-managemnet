import mongoose, { Schema, InferSchemaType } from "mongoose";

const CustomerSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["B2B", "B2C"], default: "B2C" },
    contact: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true },
    phone: { type: String, default: "" },
    gstin: { type: String, default: "" },
    billingAddress: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    creditLimit: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    totalBusiness: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CustomerSchema.index({ orgId: 1, name: 1 });

export type CustomerDoc = InferSchemaType<typeof CustomerSchema>;

export const Customer =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
