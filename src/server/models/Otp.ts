import mongoose, { Schema, InferSchemaType } from "mongoose";

const OtpSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  // TTL index: MongoDB deletes the document automatically once expiresAt passes.
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
});

export type OtpDoc = InferSchemaType<typeof OtpSchema>;

export const Otp = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
