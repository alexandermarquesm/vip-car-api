import mongoose, { Schema, Document } from "mongoose";

export interface IInviteDocument extends Document {
  email?: string;
  tenantId: string;
  tenantName: string;
  tokenHash?: string;
  expiresAt?: Date;
  usedAt?: Date;
  createdBy?: string;
  status: "pending" | "accepted" | "rejected" | "revoked";
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      select: false,
    },
    expiresAt: { type: Date, index: true },
    usedAt: { type: Date },
    createdBy: { type: String },
    tenantId: {
      type: String,
      required: true,
    },
    tenantName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "revoked"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Prevenir múltiplos convites pendentes do mesmo tenant para o mesmo email
InviteSchema.index({ email: 1, tenantId: 1, status: 1 });
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.Invite || mongoose.model<IInviteDocument>("Invite", InviteSchema);
