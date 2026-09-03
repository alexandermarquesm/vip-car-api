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
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  billingProvider?: "stripe" | "google_play" | "courtesy";
  googlePlayPurchaseTokenHash?: string;
  googlePlayObfuscatedAccountId?: string;
  googlePlayProductId?: string;
  googlePlayLatestOrderId?: string;
  variantId?: string;
  currentPeriodEnd?: Date;
  creditCardFee: number;
  debitCardFee: number;
  inviteCode: string;
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
  externalCustomerId: { type: String, index: { sparse: true } },
  externalSubscriptionId: { type: String, index: { sparse: true } },
  billingProvider: { type: String, enum: ["stripe", "google_play", "courtesy"] },
  googlePlayPurchaseTokenHash: { type: String, unique: true, sparse: true, index: true },
  googlePlayObfuscatedAccountId: { type: String, unique: true, sparse: true, index: true },
  googlePlayProductId: { type: String },
  googlePlayLatestOrderId: { type: String },
  variantId: { type: String },
  currentPeriodEnd: { type: Date },
  creditCardFee: { type: Number, default: 3.09 },
  debitCardFee: { type: Number, default: 0.89 },
  inviteCode: { type: String, unique: true, sparse: true, index: true },
});

export default mongoose.model<ITenantDocument>("Tenant", tenantSchema);
