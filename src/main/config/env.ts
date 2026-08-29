import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("3000"),
  MONGO_URI: z.string().url("MONGO_URI deve ser uma URL válida"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY é obrigatória para análise de imagens"),
  OPENAI_API_KEY: z.string().optional(),
  ANALYZE_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_BASIC: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export const loadEnv = () => {
  const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
  dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", envFile), quiet: true });
  dotenv.config({ quiet: true }); // Fallback

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Erro nas variáveis de ambiente:", parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
};
