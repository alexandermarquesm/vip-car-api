import mongoose, { Schema, Document } from "mongoose";

export interface IUserDocument extends Document<string> {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "owner" | "admin" | "worker";
  status: "active" | "inactive";
  createdAt: Date;
}

const userSchema = new Schema<IUserDocument>({
  _id: { type: String, required: true },
  tenantId: { type: String, ref: "Tenant", required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "worker" },
  status: { type: String, default: "active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUserDocument>("User", userSchema);
