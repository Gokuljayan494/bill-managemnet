import mongoose, { Schema, InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, default: "" },
    name: { type: String, default: "" },
    passwordHash: { type: String, default: "" }, // empty = OTP-only account
    role: { type: String, enum: ["owner", "staff"], default: "owner" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
