import mongoose, { Document, Schema } from "mongoose";

interface IGooglePlayNotificationDocument extends Document<string> {
  messageId: string;
  processedAt: Date;
}

const googlePlayNotificationSchema = new Schema<IGooglePlayNotificationDocument>({
  messageId: { type: String, required: true, unique: true, index: true },
  processedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
});

export default mongoose.model<IGooglePlayNotificationDocument>(
  "GooglePlayNotification",
  googlePlayNotificationSchema,
);
