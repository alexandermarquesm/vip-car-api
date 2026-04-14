import { loadEnv } from "./main/config/env";
import { connectDB } from "./infrastructure/database/mongodb-connection";
import { createApp } from "./infrastructure/webserver/express/app";
import { makeServiceController } from "./main/factories/controllers/ServiceControllerFactory";
import { makeClientController } from "./main/factories/controllers/ClientControllerFactory";
import { makeAuthController } from "./main/factories/controllers/AuthControllerFactory";

let appInstance: any = null;

const getApp = async () => {
  if (appInstance) return appInstance;

  // 1. Carregar Ambiente (Validado)
  const env = loadEnv();

  // 2. Conectar ao Banco
  await connectDB(env.MONGO_URI);
  
  // Clean up legacy global index if it exists (Multi-tenant fix)
  try {
    const mongoose = require('mongoose');
    const collection = mongoose.connection.db.collection('washes');
    await collection.dropIndex('plate_1_status_1');
  } catch (e) {
    // Index doesn't exist or already removed, ignore
  }

  // 3. Inicializar App via Factories (Composition Root)
  const serviceController = makeServiceController();
  const clientController = makeClientController();
  const authController = makeAuthController(env.JWT_SECRET);
  
  appInstance = createApp(serviceController, clientController, authController, env.JWT_SECRET);
  return appInstance;
};

// Vercel / Production Export
export default async (req: any, res: any) => {
  const app = await getApp();
  return app(req, res);
};

// Local Development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  getApp().then((app) => {
    const env = loadEnv();
    const PORT = env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando localmente na porta ${PORT}`);
    });
  }).catch((err) => {
    console.error("❌ Erro fatal ao iniciar o servidor local:", err);
    process.exit(1);
  });
}
