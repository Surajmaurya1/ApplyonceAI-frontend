// backend/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import compress from "@fastify/compress";
import { env } from "./config/env.js";
import { authRoutes } from "./routes/auth.js";
import { resumeRoutes } from "./routes/resume.js";
import { aiRoutes } from "./routes/ai.js";
import { userRoutes } from "./routes/user.js";
import { jobRoutes } from "./routes/jobs.js";
import { errorHandler } from "./middleware/errorHandler.js";

const server = Fastify({
  genReqId: () => crypto.randomUUID(), // unique ID for every request
  logger: {
    level: env.NODE_ENV === "production" ? "warn" : "info",
    ...(env.NODE_ENV !== "production" && {
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    }),
  },
});

async function buildApp() {
  // Security: Helmet sets HTTP headers (X-Frame-Options, X-Content-Type-Options, etc.)
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
    hsts:
      env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  });

  // Security: CORS — allow only specified origins
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  await server.register(cors, {
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; } // curl, server-to-server
      if (origin.startsWith("chrome-extension://")) { callback(null, true); return; }
      if (allowedOrigins.some((o) => origin === o || origin.startsWith(o))) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: Origin not allowed: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    credentials: true,
  });

  // Security: Rate limiting — global default
  await server.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)}s.`,
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
  });

  // Auth: JWT plugin
  await server.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  // File upload: limit to 10 MB, 1 file
  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  // Performance: gzip/brotli compression
  await server.register(compress, { global: true });

  // Custom error handler
  server.setErrorHandler(errorHandler);

  // Health check — no auth required, used by Railway/Render for health probes
  server.get("/health", async () => ({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }));

  // API Routes — all prefixed with /api/v1 for versioning
  await server.register(authRoutes, { prefix: "/api/v1/auth" });
  await server.register(resumeRoutes, { prefix: "/api/v1/resume" });
  await server.register(aiRoutes, { prefix: "/api/v1/ai" });
  await server.register(userRoutes, { prefix: "/api/v1/user" });
  await server.register(jobRoutes, { prefix: "/api/v1/jobs" });

  return server;
}

buildApp()
  .then(async (app) => {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`ApplyOnce AI Backend running on http://${env.HOST}:${env.PORT}`);
  })
  .catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
