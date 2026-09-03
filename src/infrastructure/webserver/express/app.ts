import express, { Express, Request, Response } from "express";
import cors from "cors";
import Stripe from "stripe";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServiceRoutes } from "./routes/serviceRoutes";
import { createClientRoutes } from "./routes/clientRoutes";
import { createAuthRoutes } from "./routes/authRoutes";
import { createSubscriptionRoutes } from "./routes/subscriptionRoutes";
import { createTeamRoutes } from "./routes/teamRoutes";
import { createExpenseRoutes } from "./routes/expenseRoutes";
import { ServiceController } from "../../../interface/controllers/ServiceController";
import { ClientController } from "../../../interface/controllers/ClientController";
import { AuthController } from "../../../interface/controllers/AuthController";
import { SubscriptionController } from "../../../interface/controllers/SubscriptionController";
import { TeamController } from "../../../interface/controllers/TeamController";
import { ExpenseController } from "../../../interface/controllers/ExpenseController";
import { errorHandler } from "./middlewares/ErrorHandler";
import { createAuthMiddleware } from "./middlewares/AuthMiddleware";
import { activeUserMiddleware } from "./middlewares/ActiveUserMiddleware";
import { loggerMiddleware } from "./middlewares/LoggerMiddleware";
import { asyncHandler } from "./utils/AsyncHandler";
import { WebhookController } from "../../../interface/controllers/WebhookController";
import { ITenantRepository } from "../../../application/repositories/ITenantRepository";
import { createSubscriptionMiddleware } from "./middlewares/SubscriptionMiddleware";
import { createPlanLimitMiddleware } from "./middlewares/PlanLimitMiddleware";

import { IUserRepository } from "../../../application/repositories/IUserRepository";

export const createApp = (
  serviceController: ServiceController,
  clientController: ClientController,
  authController: AuthController,
  webhookController: WebhookController,
  subscriptionController: SubscriptionController,
  teamController: TeamController,
  expenseController: ExpenseController,
  tenantRepository: ITenantRepository,
  userRepository: IUserRepository,
  jwtSecret: string,
  corsAllowedOrigins?: string
): Express => {
  const app = express();
  app.set("trust proxy", 1);
  const authMiddleware = createAuthMiddleware(jwtSecret, userRepository, tenantRepository);
  const subscriptionMiddleware = createSubscriptionMiddleware(tenantRepository);
  const planLimitMiddleware = createPlanLimitMiddleware(tenantRepository);
  
  // Security Middlewares
  app.use(helmet());

  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  
  let allowedOrigins: string[];
  if (corsAllowedOrigins) {
    allowedOrigins = corsAllowedOrigins.split(",").map(origin => origin.trim());
  } else {
    allowedOrigins = [
      "https://vipercar.com.br",
      "https://vip-car-website.vercel.app",
      "https://vip-car-app.vercel.app"
    ];
    if (!isProduction) {
      allowedOrigins.push(
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8081",
        "exp://localhost:8081"
      );
    }
  }

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    })
  );

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 10000, // Limit each IP to 100 requests per `window` (here, per 15 minutes) - relaxed in dev
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: "Muitas requisições deste IP, tente novamente em 15 minutos." },
  });
  app.use(limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 10 : 1000, // Limit each IP to 10 requests per 15 minutes for auth - relaxed in dev
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login ou registro, tente novamente mais tarde." },
  });

  // Webhook Route — Stripe (RAW BODY obrigatório para verificação de assinatura)
  app.post(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    asyncHandler((req: Request, res: Response) => webhookController.handleStripe(req, res))
  );

  app.use(express.json());
  app.use(loggerMiddleware);

  // Google Play RTDN — o token OIDC do Pub/Sub é validado pelo controller.
  app.post(
    "/webhooks/google-play",
    asyncHandler((req: Request, res: Response) => webhookController.handleGooglePlay(req, res)),
  );

  // Health Check
  app.get("/", (req: Request, res: Response) => {
    res.send("VIPER CAR Backend (TypeScript + Clean Architecture) está rodando! 🚗💨");
  });

  // Mobile Version Check (Public)
  app.get("/status/mobile-version", (req: Request, res: Response) => {
    res.json({
      version: "2.1.0",
      apkUrl: "https://github.com/alexandermarquesm/viper-car-website/releases/download/v2.1.0/viper-car-2.1.0.apk",
      required: false
    });
  });

  // Plans Pricing Check (Public - Multi-currency support)
  app.get("/status/plans", async (req: Request, res: Response) => {
    try {
      const requestedCurrency = (req.query.currency as string || "BRL").toUpperCase();
      const fallbackPrices = {
        basic: requestedCurrency === "USD" ? "49.90" : "49,90",
        pro: requestedCurrency === "USD" ? "89.90" : "89,90"
      };
      const secretKey = process.env.STRIPE_SECRET_KEY;
      
      const priceIdBasic = process.env.STRIPE_PRICE_ID_BASIC;
      const priceIdPro = process.env.STRIPE_PRICE_ID_PRO;

      if (!secretKey) {
        return res.json(fallbackPrices);
      }

      const stripe = new Stripe(secretKey);

      if (!priceIdBasic || !priceIdPro) {
        return res.json(fallbackPrices);
      }

      // Busca as opções de moeda do mesmo Price multimoeda.
      const [priceBasic, pricePro] = await Promise.all([
        stripe.prices.retrieve(priceIdBasic, { expand: ["currency_options"] }),
        stripe.prices.retrieve(priceIdPro, { expand: ["currency_options"] })
      ]);

      const formatStripePrice = (price: any) => {
        const currencyOption = price.currency_options?.[requestedCurrency.toLowerCase()];
        const unitAmount = currencyOption?.unit_amount ?? price.unit_amount;
        if (unitAmount === null || unitAmount === undefined) return "0,00";
        const val = unitAmount / 100;
        
        // Formatação localizada conforme a moeda
        if (requestedCurrency === "USD") {
          return val.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        } else if (requestedCurrency === "EUR") {
          return val.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
        
        // Default para BRL
        return val.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      };

      res.json({
        basic: formatStripePrice(priceBasic),
        pro: formatStripePrice(pricePro)
      });
    } catch (error) {
      console.error("Erro ao buscar preços do Stripe:", error);
      const requestedCurrency = (req.query.currency as string || "BRL").toUpperCase();
      res.json({
        basic: requestedCurrency === "USD" ? "49.90" : "49,90",
        pro: requestedCurrency === "USD" ? "89.90" : "89,90"
      });
    }
  });

  // Auth Routes (Public)
  app.use("/auth", createAuthRoutes(authController, authMiddleware, authLimiter));

  // Domain Routes (Protected & Subscription Required & Active status enforced)
  app.get("/backup", authMiddleware, activeUserMiddleware, subscriptionMiddleware, planLimitMiddleware("reports"), asyncHandler((req: any, res: any) => serviceController.backup(req, res)));
  app.use("/services", authMiddleware, activeUserMiddleware, subscriptionMiddleware, createServiceRoutes(serviceController, planLimitMiddleware));
  app.use("/clients", authMiddleware, activeUserMiddleware, subscriptionMiddleware, createClientRoutes(clientController));
  app.use("/team", authMiddleware, activeUserMiddleware, subscriptionMiddleware, createTeamRoutes(teamController));
  app.use("/expenses", authMiddleware, activeUserMiddleware, subscriptionMiddleware, planLimitMiddleware("expenses"), createExpenseRoutes(expenseController));
  
  // Subscription Routes (Protected, but does NOT require active subscription obviously)
  app.use("/subscriptions", authMiddleware, createSubscriptionRoutes(subscriptionController));

  // Error Handler (deve ser o último)
  app.use(errorHandler);


  return app;
};
