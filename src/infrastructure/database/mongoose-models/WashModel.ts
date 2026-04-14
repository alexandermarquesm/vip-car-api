import mongoose, { Schema, Document } from "mongoose";

export interface IWashDocument extends Document<string> {
  _id: string;
  tenantId: string;
  clientId: string;
  plate: string;
  carModel: string;
  price: number;
  netPrice: number;
  entryTime: Date;
  deliveryTime: Date;
  status: "pending" | "completed" | "cancelled";
  paymentMethod?: string;
  payments: {
    method: string;
    amount: number;
  }[];
  createdAt: Date;
}

const washSchema = new Schema<IWashDocument>({
  _id: { type: String, required: true },
  tenantId: { type: String, ref: "Tenant", required: true, index: true },
  clientId: { type: String, index: true },
  plate: { type: String, index: true },
  carModel: { type: String, index: true },
  price: Number,
  netPrice: Number,
  entryTime: { type: Date, default: Date.now },
  deliveryTime: { type: Date, index: true },
  status: { type: String, default: "pending", index: true },
  paymentMethod: String,
  payments: [
    {
      method: String,
      amount: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

washSchema.index({ tenantId: 1, deliveryTime: -1 });
washSchema.index(
  { tenantId: 1, plate: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model<IWashDocument>("Wash", washSchema);
