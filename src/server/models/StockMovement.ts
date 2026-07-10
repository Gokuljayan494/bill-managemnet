import mongoose, { Schema, InferSchemaType } from "mongoose";

const StockMovementSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variant: { type: String, default: "" },
    warehouse: { type: String, required: true },
    type: {
      type: String,
      enum: ["sale", "purchase", "adjustment", "transfer-in", "transfer-out", "opening"],
      required: true,
    },
    qty: { type: Number, required: true }, // negative = stock out
    refType: { type: String, default: "" }, // e.g. "invoice"
    refId: { type: Schema.Types.ObjectId },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export type StockMovementDoc = InferSchemaType<typeof StockMovementSchema>;

export const StockMovement =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", StockMovementSchema);
