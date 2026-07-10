import mongoose, { Schema } from "mongoose";

const CounterSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, required: true },
  key: { type: String, required: true }, // e.g. "invoice"
  seq: { type: Number, default: 0 },
});

CounterSchema.index({ orgId: 1, key: 1 }, { unique: true });

export const Counter =
  mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

/** Atomically get the next sequence number for an org-scoped counter. */
export async function nextSeq(
  orgId: mongoose.Types.ObjectId | string,
  key: string
): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { orgId, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
