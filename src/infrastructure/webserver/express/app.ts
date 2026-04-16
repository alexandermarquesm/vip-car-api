import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { createServiceRoutes } from "./routes/serviceRoutes";
import { createClientRoutes } from "./routes/clientRoutes";
import { createAuthRoutes } from "./routes/authRoutes";
import { ServiceController } from "../../../interface/controllers/ServiceController";
import { ClientController } from "../../../interface/controllers/ClientController";
import { AuthController } from "../../../interface/controllers/AuthController";
import { errorHandler } from "./middlewares/ErrorHandler";
import { createAuthMiddleware } from "./middlewares/AuthMiddleware";
import { loggerMiddleware } from "./middlewares/LoggerMiddleware";

export const createApp = (
  serviceController: ServiceController,
  clientController: ClientController,
  authController: AuthController,
  jwtSecret: string
): Express => {
  const app = express();
  const authMiddleware = createAuthMiddleware(jwtSecret);
  
  // Security Middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(loggerMiddleware);

  // Health Check
  app.get("/", (req: Request, res: Response) => {
    res.send("VIP CAR Backend (TypeScript + Clean Architecture) está rodando! 🚗💨");
  });

  // Auth Routes (Public)
  app.use("/auth", createAuthRoutes(authController));

  // Domain Routes (Protected)
  app.get("/backup", authMiddleware, (req: Request, res: Response) => serviceController.backup(req as any, res));
  app.use("/services", authMiddleware, createServiceRoutes(serviceController));
  app.use("/clients", authMiddleware, createClientRoutes(clientController));

  // Error Handler (deve ser o último)
  app.use(errorHandler);

  return app;
};
