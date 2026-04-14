import { loadEnv } from "./main/config/env";
import { connectDB } from "./infrastructure/database/mongodb-connection";
import { createApp } from "./infrastructure/webserver/express/app";
import { makeServiceController } from "./main/factories/controllers/ServiceControllerFactory";
import { makeClientController } from "./main/factories/controllers/ClientControllerFactory";
import { makeAuthController } from "./main/factories/controllers/AuthControllerFactory";

const startServer = async () => {
  // 1. Carregar Ambiente (Validado)
  const env = loadEnv();

  // 2. Conectar ao Banco
  await connectDB(env.MONGO_URI);
  
  // Clean up legacy global index if it exists (Multi-tenant fix)
  try {
    const mongoose = require('mongoose');
    const collection = mongoose.connection.db.collection('washes');
    await collection.dropIndex('plate_1_status_1');
    // console.log('Legacy index plate_1_status_1 removed successfully.');
  } catch (e) {
    // Index doesn't exist or already removed, ignore
  }

  // 3. Inicializar App via Factories (Composition Root)
  const serviceController = makeServiceController();
  const clientController = makeClientController();
  const authController = makeAuthController(env.JWT_SECRET);
  
  const app = createApp(serviceController, clientController, authController, env.JWT_SECRET);

  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    // Server running
  });
};

startServer().catch((err) => {
  console.error("❌ Erro fatal ao iniciar o servidor:", err);
  process.exit(1);
});
