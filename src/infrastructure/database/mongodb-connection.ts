import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async (mongoUri: string): Promise<void> => {
  if (!mongoUri) {
    throw new Error("❌ Erro: MONGO_URI não definida!");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const db = await mongoose.connect(mongoUri);
    isConnected = db.connections[0].readyState === 1;
  } catch (err) {
    console.error("❌ Erro ao conectar no MongoDB:", err);
    throw err;
  }
};
