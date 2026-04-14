import mongoose, { Schema, Document } from "mongoose";

export interface ITenantDocument extends Document<string> {
  _id: string;
  name: string;
  document?: string;
  status: "active" | "inactive" | "suspended";
  plan: "trial" | "monthly";
  subscriptionStatus: "active" | "past_due" | "canceled";
  trialEndsAt: Date;
  createdAt: Date;
}

const tenantSchema = new Schema<ITenantDocument>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  document: { type: String },
  status: { type: String, default: "active", index: true },
  plan: { type: String, default: "trial" },
  subscriptionStatus: { type: String, default: "active" },
  trialEndsAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITenantDocument>("Tenant", tenantSchema);
