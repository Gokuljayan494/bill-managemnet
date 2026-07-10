import mongoose, { Schema, InferSchemaType } from "mongoose";

const ProductSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    internalNotes: { type: String, default: "" },

    sku: { type: String, default: "", trim: true },
    barcode: { type: String, default: "" },
    hsn: { type: String, default: "" },
    itemCode: { type: String, default: "" },
    internalCode: { type: String, default: "" },
    mpn: { type: String, default: "" },

    category: { type: String, default: "", index: true },
    brand: { type: String, default: "" },
    tags: [{ type: String }],

    baseUnit: { type: String, default: "Piece" },
    sellingUnit: { type: String, default: "" },
    conversions: [
      {
        from: String,
        qty: Number,
        to: String,
      },
    ],

    prices: {
      retail: { type: Number, default: 0 },
      wholesale: { type: Number, default: 0 },
      distributor: { type: Number, default: 0 },
      dealer: { type: Number, default: 0 },
      online: { type: Number, default: 0 },
    },
    purchaseCost: { type: Number, default: 0 },
    gstRate: { type: Number, default: 18 },
    taxInclusive: { type: Boolean, default: false },

    images: [
      {
        url: String,
        publicId: String,
      },
    ],

    variants: [
      {
        name: String, // e.g. "Large / Blue"
        options: { type: Map, of: String },
        price: { type: Number, default: 0 },
        sku: { type: String, default: "" },
        stock: { type: Number, default: 0 },
      },
    ],

    // one entry per warehouse
    stock: [
      {
        warehouse: { type: String, required: true },
        onHand: { type: Number, default: 0 },
        reserved: { type: Number, default: 0 },
        reorderLevel: { type: Number, default: 0 },
        minStock: { type: Number, default: 0 },
        maxStock: { type: Number, default: 0 },
      },
    ],

    tracking: {
      batch: { type: Boolean, default: false },
      expiry: { type: Boolean, default: false },
      serial: { type: Boolean, default: false },
      lot: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

ProductSchema.index({ orgId: 1, sku: 1 });
ProductSchema.index({ orgId: 1, name: "text", sku: "text" });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
