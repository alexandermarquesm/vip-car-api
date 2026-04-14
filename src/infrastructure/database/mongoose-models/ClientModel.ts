import mongoose, { Schema, Document } from "mongoose";

export interface IClientDocument extends Document<string> {
  _id: string;
  tenantId: string;
  name: string;
  phone: string;
  vehicles: {
    plate: string;
    carModel: string;
  }[];
  createdAt: Date;
}

const clientSchema = new Schema<IClientDocument>({
  _id: { type: String, required: true },
  tenantId: { type: String, ref: "Tenant", required: true, index: true },
  name: String,
  phone: { type: String, index: true },
  vehicles: [
    {
      plate: String,
      carModel: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Compound unique index so the same phone can be used by different tenants
clientSchema.index({ tenantId: 1, phone: 1 }, { unique: true });

export default mongoose.model<IClientDocument>("Client", clientSchema);
