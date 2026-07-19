// backend/src/config/env.ts
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default("0.0.0.0"),

  // JWT — must be at least 32 characters (64 hex chars recommended)
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // AI Providers — at least one must be provided
  GOOGLE_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // CORS — comma-separated list of allowed origins
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173,chrome-extension://"),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

  // Optional: Database URL for future persistence
  DATABASE_URL: z.string().url().optional(),

  // Optional: Redis for production rate limiting
  REDIS_URL: z.string().url().optional(),
});

// Validate at startup. Exit immediately if config is invalid.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("FATAL: Invalid environment configuration:");
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

// Ensure at least one AI provider key is available
const hasAnyAIKey =
  env.GOOGLE_API_KEY ||
  env.GROQ_API_KEY ||
  env.CEREBRAS_API_KEY ||
  env.OPENROUTER_API_KEY;

if (!hasAnyAIKey) {
  console.error("FATAL: At least one AI provider API key must be configured.");
  process.exit(1);
}

export { env };
export type Env = typeof env;
