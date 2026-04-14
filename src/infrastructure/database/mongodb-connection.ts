import mongoose from "mongoose";

export const connectDB = async (mongoUri: string): Promise<void> => {
  if (!mongoUri) {
    console.error("❌ Erro: MONGO_URI não definida!");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    // Connection successful
  } catch (err) {
    console.error("❌ Erro ao conectar no MongoDB:", err);
    process.exit(1);
  }
};
