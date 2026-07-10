import mongoose, { Schema, InferSchemaType } from "mongoose";

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    domains: [
      {
        domain: { type: String, lowercase: true, trim: true },
        verified: { type: Boolean, default: false },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    settings: {
      currency: { type: String, default: "INR" },
      defaultGstRate: { type: Number, default: 18 },
      invoicePrefix: { type: String, default: "INV-" },
      paymentTerms: { type: String, default: "Net 15" },
      gstin: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    branding: {
      logoUrl: { type: String, default: "" },
      brandColor: { type: String, default: "#0e7553" },
    },
  },
  { timestamps: true }
);

export type OrganizationDoc = InferSchemaType<typeof OrganizationSchema>;

export const Organization =
  mongoose.models.Organization ||
  mongoose.model("Organization", OrganizationSchema);
