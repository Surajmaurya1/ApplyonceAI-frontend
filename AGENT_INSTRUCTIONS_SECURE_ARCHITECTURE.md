# ApplyOnce AI – Secure Architecture Migration
## Agent Instruction Document (Production-Ready)

> **This document is the single source of truth for migrating ApplyOnce AI from a
> client-side API key architecture to a fully secure backend-proxied architecture.**
>
> Follow every step in exact order. Do not skip, combine, or reorder steps.
> Before writing any code, read the full step and its context.
> After every step, verify the stated acceptance criteria before moving to the next step.

---

## Table of Contents

1. [Pre-Migration Analysis](#step-1-pre-migration-analysis)
2. [Security Audit](#step-2-security-audit)
3. [Project Restructure](#step-3-project-restructure)
4. [Backend Foundation](#step-4-backend-foundation)
5. [Authentication System](#step-5-authentication-system)
6. [AI Router (Backend)](#step-6-ai-router-backend)
7. [REST API Endpoints](#step-7-rest-api-endpoints)
8. [Backend Security Hardening](#step-8-backend-security-hardening)
9. [Extension Refactor](#step-9-extension-refactor)
10. [Frontend Migration](#step-10-frontend-migration)
11. [Environment Variables and Secrets](#step-11-environment-variables-and-secrets)
12. [Extension Build and Packaging](#step-12-extension-build-and-packaging)
13. [CI/CD Pipeline](#step-13-cicd-pipeline)
14. [Deployment Guide](#step-14-deployment-guide)
15. [Testing Guide](#step-15-testing-guide)
16. [Rollback Plan](#step-16-rollback-plan)
17. [Final Security Audit](#step-17-final-security-audit)

---

## CURRENT STATE (Read Before Starting)

### Workspace Root
```
c:\Users\DeLL\Downloads\lovable-project\
```

### Current File Map — Files Containing API Keys or Direct AI Calls

| File | Issue |
|------|-------|
| `extension/.env` | Contains 4 live API keys in plaintext |
| `extension/src/lib/ai/gemini.ts` | Reads `GEMINI_API_KEY` via `getEnv()`, calls `generativelanguage.googleapis.com` directly |
| `extension/src/lib/ai/groq.ts` | Reads `GROQ_API_KEY` via `getEnv()`, calls `api.groq.com` directly |
| `extension/src/lib/ai/cerebras.ts` | Reads `CEREBRAS_API_KEY` via `getEnv()`, calls `api.cerebras.ai` directly |
| `extension/src/lib/ai/openrouter.ts` | Reads `OPENROUTER_API_KEY` via `getEnv()`, calls `openrouter.ai` directly |
| `extension/src/lib/ai/provider.ts` | `getEnv()` reads from `import.meta.env` — Vite bakes these into popup.js at build time |
| `extension/src/lib/ai/fallback.ts` | Orchestrates direct provider calls client-side |
| `extension/src/lib/ai/index.ts` | Instantiates all 4 providers with API key reading |
| `extension/src/services/geminiService.ts` | Calls `ai.generateText()` which leads to direct API call |
| `extension/src/hooks/useAutofill.ts` | Calls `generateAutofillMapping()` which leads to direct AI call |
| `extension/src/ai/prompts.ts` | Prompt templates (should be server-side only) |

### Current Architecture (Broken Security Model)
```
Chrome Extension (popup.js has baked-in API keys from VITE_* vars)
       |
       v
Gemini API / Groq API / Cerebras API / OpenRouter API
```

### Target Architecture
```
Chrome Extension (zero secrets, JWT auth only)
       |
       v  HTTPS + Bearer JWT
Backend API (https://api.applyonce.ai)
       |
       v  Server-side API keys, never exposed
Gemini / Groq / Cerebras / OpenRouter
```

---

## STEP 1: Pre-Migration Analysis

### 1.1 Understand What Each File Does

Before changing anything, read and understand every file listed below.

**AI Provider Layer — ALL will be deleted from extension:**
- `extension/src/lib/ai/gemini.ts` — HTTP client for Gemini REST API. Reads `GEMINI_API_KEY` from `getEnv()` and sends fetch to `generativelanguage.googleapis.com`.
- `extension/src/lib/ai/groq.ts` — HTTP client for Groq REST API. Reads `GROQ_API_KEY` from `getEnv()`. Sends fetch to `api.groq.com`.
- `extension/src/lib/ai/cerebras.ts` — HTTP client for Cerebras REST API. Reads `CEREBRAS_API_KEY`. Sends fetch to `api.cerebras.ai`.
- `extension/src/lib/ai/openrouter.ts` — HTTP client for OpenRouter REST API. Reads `OPENROUTER_API_KEY`. Sends fetch to `openrouter.ai`.
- `extension/src/lib/ai/provider.ts` — Base class + `getEnv()` function that reads `import.meta.env.VITE_*`. This is what causes Vite to bake the keys into the bundle.
- `extension/src/lib/ai/fallback.ts` — `FallbackAIOrchestrator` class. Tries providers in order: Gemini → Groq → Cerebras → OpenRouter. This logic moves to backend.
- `extension/src/lib/ai/index.ts` — Entry point. Instantiates all 4 providers and exports `ai` (the orchestrator).
- `extension/src/lib/ai/types.ts` — TypeScript interfaces: `AIProvider`, `AIResponse`, `RequestOptions`, error classes. Move to `shared/`.

**Service Layer — will be refactored:**
- `extension/src/services/geminiService.ts` — Resume parsing + autofill mapping. Calls `ai.generateText()`. This file stays but its internals change to call the backend.
- `extension/src/services/pdfService.ts` — PDF extraction using pdfjs-dist. KEEP unchanged. Runs client-side in the extension, never touches AI providers.

**Hook Layer — will be refactored:**
- `extension/src/hooks/useAutofill.ts` — Calls `generateAutofillMapping()` from geminiService. The hook itself barely changes; only the underlying service changes.
- `extension/src/hooks/useProfile.ts` — Manages chrome.storage. KEEP unchanged.

**Storage — KEEP:**
- `extension/src/storage/profileStorage.ts` — `chrome.storage.local` wrapper for `UserProfile`. No secrets. No changes needed.

**Content Script — KEEP:**
- `extension/src/content/content.ts` — Form detection + autofill execution. No AI calls. No secrets.

**Background — KEEP:**
- `extension/src/background/background.ts` — Service worker. No AI calls.

**AI Prompts — MOVE to backend:**
- `extension/src/ai/prompts.ts` — `RESUME_PARSE_PROMPT` and `AUTOFILL_MAPPING_PROMPT`. Must move to `backend/src/services/prompts.ts`. Never expose prompt templates to the client — they reveal your prompt engineering.

**UI Components — KEEP:**
- `extension/src/components/` — All React components. No AI calls. No secrets.
- `extension/src/popup/Popup.tsx` — Main popup. Add auth gate in Step 9.

### 1.2 Map Every Direct AI Call

Run these searches from the workspace root. Document every result:

```bash
grep -r "generativelanguage.googleapis.com" extension/src/
grep -r "api.groq.com" extension/src/
grep -r "api.cerebras.ai" extension/src/
grep -r "openrouter.ai" extension/src/
grep -r "GEMINI_API_KEY\|GROQ_API_KEY\|CEREBRAS_API_KEY\|OPENROUTER_API_KEY" extension/src/
grep -r "import.meta.env" extension/src/
grep -r "getEnv(" extension/src/
grep -r "ai\.generateText" extension/src/
grep -r "generateAutofillMapping\|parseResumeToProfile" extension/src/
```

### 1.3 Understand the Current Data Flows

**Resume Upload Flow (current):**
```
User drops PDF
  → extension/src/components/ResumeUpload.tsx
  → extension/src/services/pdfService.ts (extractTextFromPDF)
  → extension/src/services/geminiService.ts (parseResumeToProfile)
  → extension/src/lib/ai/index.ts (ai.generateText)
  → extension/src/lib/ai/fallback.ts (FallbackAIOrchestrator)
  → extension/src/lib/ai/gemini.ts (GeminiProvider)
  → fetch("generativelanguage.googleapis.com?key=VITE_GEMINI_API_KEY")
  → returns UserProfile JSON
  → extension/src/storage/profileStorage.ts (saveProfile)
```

**Autofill Flow (current):**
```
User clicks Autofill
  → extension/src/hooks/useAutofill.ts (triggerAutofill)
  → content script GET_FIELDS message
  → extension/src/utils/formDetector.ts (detectFormFields)
  → back to useAutofill.ts
  → extension/src/services/geminiService.ts (generateAutofillMapping)
  → extension/src/lib/ai/index.ts (ai.generateText)
  → extension/src/lib/ai/fallback.ts (FallbackAIOrchestrator)
  → GeminiProvider / GroqProvider / CerebrasProvider / OpenRouterProvider
  → fetch with API key
  → returns AutofillMapping JSON
  → content script AUTOFILL message
  → extension/src/utils/autofillEngine.ts (autofillForm)
```

**Target Resume Upload Flow (after migration):**
```
User drops PDF
  → ResumeUpload.tsx
  → pdfService.ts (extractTextFromPDF) — still client-side
  → geminiService.ts (parseResumeToProfile) — refactored
  → lib/apiClient.ts (POST /api/v1/resume/analyze with JWT)
  → backend: resumeRoutes.ts → aiRouter.ts → GeminiProvider (server-side key)
  → returns UserProfile JSON
  → profileStorage.ts (saveProfile)
```

**Target Autofill Flow (after migration):**
```
User clicks Autofill
  → useAutofill.ts (triggerAutofill) — minimal changes
  → content script GET_FIELDS → formDetector.ts
  → geminiService.ts (generateAutofillMapping) — refactored
  → lib/apiClient.ts (POST /api/v1/ai/autofill with JWT)
  → backend: aiRoutes.ts → aiRouter.ts → GeminiProvider (server-side key)
  → returns AutofillMapping JSON
  → content script AUTOFILL → autofillEngine.ts
```

### 1.4 Acceptance Criteria for Step 1

- [ ] You have a complete list of all files containing API calls or API key reads
- [ ] You understand the resume upload flow end-to-end (current and target)
- [ ] You understand the autofill flow end-to-end (current and target)
- [ ] You have NOT modified any file yet

---

## STEP 2: Security Audit

### 2.1 Revoke All Compromised Keys Immediately

> **CRITICAL — Do this before any code changes. The keys in `extension/.env` are compromised.**

The extension's `dist/` folder was committed to git. Vite baked the keys from `extension/.env` into `extension/dist/popup.js`. Anyone who cloned the repo has these keys.

Go to each provider's console and revoke these exact keys:

| Provider | Key Prefix | Console URL |
|----------|-----------|-------------|
| Google Gemini | `AQ.Ab8RN6LVdE2pF...` | https://aistudio.google.com/app/apikey |
| Groq | `gsk_cONFkldvvTh...` | https://console.groq.com/keys |
| Cerebras | `csk-nfpwkf59vw...` | https://cloud.cerebras.ai/platform/api-keys |
| OpenRouter | `sk-or-v1-7ec019...` | https://openrouter.ai/keys |

After revoking, generate **new keys** for **backend use only**. Do not put new keys in the extension.

### 2.2 Audit Git History

```bash
# Check if extension/.env was ever committed
git log --all --full-history -- "extension/.env"

# Check if extension/dist was ever committed
git log --all --full-history -- "extension/dist/"

# Search all commits for key patterns
git log -p --all | grep -E "GEMINI_API_KEY=|GROQ_API_KEY=|CEREBRAS_API_KEY=|OPENROUTER_API_KEY="
```

If found in history: since this project is connected to Lovable, **do NOT force push or rebase committed history** (it will break Lovable's sync). Instead:
- Revoke and rotate all exposed keys (done above)
- Ensure new keys are never committed (done in Step 2.3)
- Note the risk in your security documentation

### 2.3 Verify and Fix .gitignore Files

Check `extension/.gitignore` and the root `.gitignore`. Both must contain these entries. Add them if missing:

```
.env
.env.local
.env.*.local
dist/
*.zip
node_modules/
```

This is the **only file modification allowed in Step 2**.

### 2.4 Acceptance Criteria for Step 2

- [ ] All 4 old API keys have been revoked in provider dashboards
- [ ] New keys have been generated (kept offline for now, not in any file)
- [ ] Git history has been audited and the risk noted
- [ ] `.gitignore` files protect `.env` and `dist/` at both root and extension level
- [ ] No new code written yet

---

## STEP 3: Project Restructure

### 3.1 Why This Structure

The current project mixes the frontend (Lovable/TanStack) and extension at the root level. There is no backend. Separating into clear directories:
- Prevents secrets from leaking across modules
- Enables independent deployments (frontend on Vercel, backend on Railway, extension on Chrome Web Store)
- Makes the security boundary explicit and auditable
- Allows separate CI/CD pipelines per component

### 3.2 Target Directory Structure

```
lovable-project/                    (workspace root — keep Lovable frontend here)
├── src/                            (existing Lovable/TanStack frontend — DO NOT MOVE)
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
│
├── backend/                        NEW: Fastify API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── resume.ts
│   │   │   ├── ai.ts
│   │   │   ├── user.ts
│   │   │   └── jobs.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── services/
│   │   │   ├── aiRouter.ts
│   │   │   ├── prompts.ts
│   │   │   ├── jwtService.ts
│   │   │   └── providers/
│   │   │       ├── types.ts
│   │   │       ├── gemini.ts
│   │   │       ├── groq.ts
│   │   │       ├── cerebras.ts
│   │   │       └── openrouter.ts
│   │   ├── config/
│   │   │   └── env.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                        NEVER COMMIT — all AI keys live here
│   └── .env.example                Committed — shows required vars, no values
│
├── extension/                      (existing — keep path, refactor contents)
│   ├── src/
│   │   ├── ai/
│   │   │   └── prompts.ts          DELETE — prompts move to backend
│   │   ├── background/
│   │   │   └── background.ts       KEEP unchanged
│   │   ├── components/             KEEP unchanged
│   │   ├── content/
│   │   │   └── content.ts          KEEP unchanged
│   │   ├── hooks/
│   │   │   ├── useAutofill.ts      KEEP (underlying service changes)
│   │   │   ├── useProfile.ts       KEEP unchanged
│   │   │   └── useAuth.ts          NEW — JWT management
│   │   ├── lib/
│   │   │   ├── ai/                 DELETE entire directory
│   │   │   ├── apiClient.ts        NEW — authenticated fetch wrapper
│   │   │   └── utils.ts            KEEP
│   │   ├── options/                KEEP
│   │   ├── popup/
│   │   │   └── Popup.tsx           KEEP, add auth gate
│   │   ├── services/
│   │   │   ├── geminiService.ts    REFACTOR — call backend, not AI directly
│   │   │   └── pdfService.ts       KEEP unchanged
│   │   ├── storage/
│   │   │   ├── profileStorage.ts   KEEP unchanged
│   │   │   └── authStorage.ts      NEW — JWT token storage
│   │   └── types/
│   │       └── index.ts            KEEP, add auth types
│   ├── manifest.json               UPDATE — restrict host_permissions
│   ├── vite.config.ts              KEEP (no AI key defines)
│   └── .env.example                ONLY VITE_API_URL — no AI keys
│
└── shared/                         NEW: Shared TypeScript types
    ├── types/
    │   ├── profile.ts
    │   ├── ai.ts
    │   └── index.ts
    └── package.json
```

### 3.3 Important Note About the Frontend

The Lovable connection is tied to the root directory. Do **NOT** move the existing `src/`, `public/`, `package.json`, `vite.config.ts` out of the root. Only add new directories (`backend/`, `shared/`) alongside the existing structure.

### 3.4 Create Directory Structure

Run these commands from the workspace root:

```bash
mkdir -p backend/src/routes
mkdir -p backend/src/middleware
mkdir -p backend/src/services/providers
mkdir -p backend/src/config
mkdir -p shared/types
```

### 3.5 Acceptance Criteria for Step 3

- [ ] `backend/` directory exists with the subdirectory structure above
- [ ] `shared/` directory exists
- [ ] Existing frontend files at root are untouched
- [ ] Extension files are untouched (refactored in Step 9)

---

## STEP 4: Backend Foundation

### 4.1 Technology Choice Rationale

**Use Fastify** (not Express, not Next.js API Routes):
- **vs Express**: Fastify is 2-4x faster due to schema-based serialization and optimized routing. Built-in TypeScript support. Better plugin architecture.
- **vs Next.js API Routes**: Next.js API routes couple the backend to the frontend framework and deployment (Vercel). Our backend is a standalone service that needs to run independently with environment variables the extension can reach. Fastify is the right tool.
- **Plugin ecosystem**: `@fastify/jwt`, `@fastify/rate-limit`, `@fastify/multipart`, `@fastify/cors`, `@fastify/helmet` — all official, well-maintained.

### 4.2 Create `backend/package.json`

```json
{
  "name": "applyonce-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint src/ --ext .ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/multipart": "^8.3.0",
    "@fastify/compress": "^7.0.3",
    "zod": "^3.23.8",
    "pino": "^9.3.1",
    "pino-pretty": "^11.2.1",
    "pdf-parse": "^1.1.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.5.3",
    "tsx": "^4.16.2",
    "@types/node": "^22.0.0",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcryptjs": "^2.4.6",
    "@types/pdf-parse": "^1.1.4",
    "vitest": "^2.0.3",
    "eslint": "^9.7.0"
  }
}
```

### 4.3 Create `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4.4 Create `backend/src/config/env.ts`

This is the single point of environment access. All `process.env` reads in the backend MUST go through this file. This enables startup validation and prevents silent failures from missing configuration.

```typescript
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
```

### 4.5 Create `backend/src/middleware/errorHandler.ts`

```typescript
// backend/src/middleware/errorHandler.ts
import type { FastifyRequest, FastifyReply } from "fastify";

export function errorHandler(
  error: Error & { statusCode?: number; validation?: unknown[] },
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = error.statusCode ?? 500;

  // Log all 500-level errors with full details
  if (statusCode >= 500) {
    request.log.error(
      { err: error, url: request.url, method: request.method },
      "Internal server error"
    );
  }

  const isProduction = process.env.NODE_ENV === "production";

  reply.status(statusCode).send({
    statusCode,
    error: statusCode === 500 ? "Internal Server Error" : error.message,
    // Never expose stack traces or internal details in production
    message:
      isProduction && statusCode === 500
        ? "An unexpected error occurred. Please try again later."
        : error.message,
    ...(error.validation && { validation: error.validation }),
  });
}
```

### 4.6 Create `backend/src/index.ts` (Server Entry Point)

```typescript
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
```

### 4.7 Acceptance Criteria for Step 4

- [ ] `backend/package.json` created
- [ ] `backend/tsconfig.json` created
- [ ] `backend/src/config/env.ts` created with Zod validation
- [ ] `backend/src/middleware/errorHandler.ts` created
- [ ] `backend/src/index.ts` created
- [ ] `cd backend && npm install` completes without errors
- [ ] `npm run dev` starts the server
- [ ] `GET http://localhost:3001/health` returns `{"status":"ok",...}`
- [ ] Starting with missing JWT_SECRET causes the process to exit with a clear error message

---

## STEP 5: Authentication System

### 5.1 Architecture Decision

For MVP launch, use **stateless JWT architecture** with an in-memory user store. This is production-ready for early users and does not require a database to be set up immediately. A database migration path is documented in the deployment guide.

Users receive:
- **Access Token** (15 minutes): Sent with every authenticated API request in `Authorization: Bearer <token>`
- **Refresh Token** (7 days): Stored in `chrome.storage.local`, used only to obtain new access tokens

### 5.2 Create `backend/src/services/jwtService.ts`

```typescript
// backend/src/services/jwtService.ts
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
}

export function generateTokenPair(userId: string, email: string): TokenPair {
  const accessToken = jwt.sign(
    { userId, email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
  const refreshToken = jwt.sign(
    { userId, email },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
  return { accessToken, refreshToken, expiresIn: parseExpiryToSeconds(env.JWT_EXPIRES_IN) };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

function parseExpiryToSeconds(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  switch (unit) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 900;
  }
}
```

### 5.3 Create `backend/src/middleware/auth.ts`

```typescript
// backend/src/middleware/auth.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../services/jwtService.js";

// Augment Fastify's Request type to include the user property
declare module "fastify" {
  interface FastifyRequest {
    user: { userId: string; email: string };
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Missing Authorization header. Expected: Bearer <token>",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    request.user = { userId: payload.userId, email: payload.email };
  } catch (err: any) {
    const isExpired = err.name === "TokenExpiredError";
    reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: isExpired
        ? "Access token expired. Call /api/v1/auth/refresh to get a new one."
        : "Invalid access token.",
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
}
```

### 5.4 Create `backend/src/routes/auth.ts`

```typescript
// backend/src/routes/auth.ts
// MVP: In-memory user store. Replace with a database (Postgres/SQLite) before scaling.
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateTokenPair, verifyRefreshToken } from "../services/jwtService.js";
import { requireAuth } from "../middleware/auth.js";

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  credits: number;
}

// In-memory store: Map<email, StoredUser>
// Replace with database queries in production
const users = new Map<string, StoredUser>();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/register
  fastify.post("/register", async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Validation Error",
        message: result.error.errors.map((e) => e.message).join(". "),
      });
    }

    const { email, password } = result.data;

    if (users.has(email.toLowerCase())) {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "An account with this email already exists.",
      });
    }

    // Cost factor 12: good balance of security vs. speed (~300ms on modern hardware)
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    const user: StoredUser = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
      credits: 100,
    };

    users.set(email.toLowerCase(), user);
    const tokens = generateTokenPair(userId, email.toLowerCase());

    return reply.status(201).send({
      message: "Account created successfully.",
      user: { id: userId, email: email.toLowerCase(), credits: user.credits },
      ...tokens,
    });
  });

  // POST /api/v1/auth/login
  fastify.post("/login", async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Validation Error",
        message: "Invalid email or password format.",
      });
    }

    const { email, password } = result.data;
    const user = users.get(email.toLowerCase());

    // Always run bcrypt.compare even when user doesn't exist.
    // This prevents timing attacks that would reveal whether an email is registered.
    const dummyHash = "$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const hashToCheck = user?.passwordHash ?? dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatch) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid email or password.",
      });
    }

    const tokens = generateTokenPair(user.id, user.email);
    return reply.send({
      message: "Login successful.",
      user: { id: user.id, email: user.email, credits: user.credits },
      ...tokens,
    });
  });

  // POST /api/v1/auth/refresh
  fastify.post("/refresh", async (request, reply) => {
    const result = refreshSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "refreshToken is required.",
      });
    }

    try {
      const payload = verifyRefreshToken(result.data.refreshToken);
      const tokens = generateTokenPair(payload.userId, payload.email);
      return reply.send({ message: "Tokens refreshed.", ...tokens });
    } catch {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid or expired refresh token.",
      });
    }
  });

  // POST /api/v1/auth/logout
  // In stateless JWT, logout is handled client-side by deleting stored tokens.
  // For server-side invalidation, add tokens to a Redis blocklist here.
  fastify.post("/logout", { preHandler: requireAuth }, async (_request, reply) => {
    return reply.send({ message: "Logged out successfully." });
  });
}
```

### 5.5 Acceptance Criteria for Step 5

- [ ] `POST /api/v1/auth/register` with valid data returns 201 with `accessToken` and `refreshToken`
- [ ] `POST /api/v1/auth/register` with duplicate email returns 409
- [ ] `POST /api/v1/auth/login` with valid credentials returns 200 with tokens
- [ ] `POST /api/v1/auth/login` with wrong password returns 401
- [ ] `POST /api/v1/auth/refresh` with valid refresh token returns new token pair
- [ ] Passwords are stored as bcrypt hashes (never plaintext)
- [ ] Access token expires after 15 minutes (verify by inspecting JWT `exp` field)

---

## STEP 6: AI Router (Backend)

### 6.1 Overview

The AI routing logic currently in `extension/src/lib/ai/` must be completely moved to the backend. The extension must never call AI providers directly. This step:
- Creates backend provider classes (reading from `env.*`, never from client)
- Creates the AI router with fallback chain
- Creates the prompts file (moved from extension)

### 6.2 Create `backend/src/services/providers/types.ts`

```typescript
// backend/src/services/providers/types.ts
export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIResponse {
  text: string;
  usage?: AIUsage;
  finishReason?: string;
  model: string;
  provider: string;
}

export interface RequestOptions {
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  generateText(prompt: string, options?: RequestOptions): Promise<AIResponse>;
}

// Error hierarchy — same as the extension's types.ts but now server-side
export class BaseAIError extends Error {
  constructor(message: string, public readonly provider?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
export class RateLimitError extends BaseAIError {}
export class ProviderUnavailableError extends BaseAIError {}
export class TimeoutError extends BaseAIError {}
export class AuthenticationError extends BaseAIError {}
export class ValidationError extends BaseAIError {}
```

### 6.3 Create `backend/src/services/providers/gemini.ts`

```typescript
// backend/src/services/providers/gemini.ts
// API key is read from server environment — never from the client.
import { env } from "../../config/env.js";
import {
  AIProvider, AIResponse, RequestOptions,
  ValidationError, AuthenticationError, RateLimitError,
  TimeoutError, ProviderUnavailableError,
} from "./types.js";

export class GeminiProvider implements AIProvider {
  readonly name = "Gemini";
  private readonly model = "gemini-1.5-flash";
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

  async generateText(prompt: string, options?: RequestOptions): Promise<AIResponse> {
    const apiKey = env.GOOGLE_API_KEY;
    if (!apiKey) throw new ValidationError("Gemini API key not configured.", this.name);

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        ...(options?.maxTokens && { maxOutputTokens: options.maxTokens }),
      },
    });

    const response = await this.fetchWithTimeout(
      url,
      { method: "POST", headers: { "Content-Type": "application/json" }, body },
      options?.timeoutMs ?? 30000
    );

    await this.assertOk(response);
    const data = await response.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new ValidationError("Empty response from Gemini.", this.name);

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: data.candidates?.[0]?.finishReason,
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err.name === "AbortError")
        throw new TimeoutError(`Gemini timed out after ${ms}ms`, this.name);
      throw new ProviderUnavailableError(`Network error: ${err.message}`, this.name);
    } finally {
      clearTimeout(id);
    }
  }

  private async assertOk(response: Response): Promise<void> {
    if (response.ok) return;
    const text = await response.text().catch(() => response.statusText);
    const msg = `Gemini API (${response.status}): ${text}`;
    if (response.status === 401 || response.status === 403)
      throw new AuthenticationError(msg, this.name);
    if (response.status === 429) throw new RateLimitError(msg, this.name);
    if (response.status >= 500) throw new ProviderUnavailableError(msg, this.name);
    throw new ValidationError(msg, this.name);
  }
}
```

### 6.4 Create `backend/src/services/providers/groq.ts`

Same pattern as Gemini. Key differences:
- URL: `https://api.groq.com/openai/v1/chat/completions`
- Auth: `Authorization: Bearer ${env.GROQ_API_KEY}`
- Model: `llama-3.3-70b-versatile`
- Request body: `{ model, messages: [{ role: "user", content: prompt }], temperature }`
- Response: `data.choices[0].message.content` (OpenAI-compatible format)
- Usage: `data.usage.prompt_tokens`, `data.usage.completion_tokens`, `data.usage.total_tokens`

Write this file following the same class structure as `gemini.ts` with the above changes.

### 6.5 Create `backend/src/services/providers/cerebras.ts`

Same pattern as Groq. Key differences:
- URL: `https://api.cerebras.ai/v1/chat/completions`
- Auth: `Authorization: Bearer ${env.CEREBRAS_API_KEY}`
- Model: `llama3.1-8b`
- Request/response: identical to Groq (OpenAI-compatible)

### 6.6 Create `backend/src/services/providers/openrouter.ts`

Same pattern as Groq. Key differences:
- URL: `https://openrouter.ai/api/v1/chat/completions`
- Auth: `Authorization: Bearer ${env.OPENROUTER_API_KEY}`
- Model: `openrouter/free` (or `mistralai/mistral-7b-instruct:free`)
- Extra headers: `HTTP-Referer: https://applyonce.ai` and `X-Title: ApplyOnce AI`
- Request/response: identical to Groq (OpenAI-compatible)

### 6.7 Create `backend/src/services/aiRouter.ts`

```typescript
// backend/src/services/aiRouter.ts
// The AI fallback orchestrator — runs entirely on the server.
// API keys are never sent to the client.
import { GeminiProvider } from "./providers/gemini.js";
import { GroqProvider } from "./providers/groq.js";
import { CerebrasProvider } from "./providers/cerebras.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import {
  AIProvider, AIResponse, RequestOptions,
  RateLimitError, TimeoutError, ProviderUnavailableError,
} from "./providers/types.js";
import { env } from "../config/env.js";

// Build provider list based on which keys are configured.
// Order determines priority: Gemini → Groq → Cerebras → OpenRouter
function buildProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (env.GOOGLE_API_KEY) providers.push(new GeminiProvider());
  if (env.GROQ_API_KEY) providers.push(new GroqProvider());
  if (env.CEREBRAS_API_KEY) providers.push(new CerebrasProvider());
  if (env.OPENROUTER_API_KEY) providers.push(new OpenRouterProvider());
  return providers;
}

// Instantiated once at startup. Adding new providers requires server restart.
const providers = buildProviders();

/**
 * Generates text using the first available AI provider.
 * Falls through to the next provider if one fails.
 * Retries transient errors (rate limits, timeouts) before falling through.
 */
export async function generateText(
  prompt: string,
  options?: RequestOptions
): Promise<AIResponse> {
  if (providers.length === 0) {
    throw new Error("No AI providers configured on the server.");
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      return await executeWithRetry(provider, prompt, options);
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[AI Router] ${provider.name} failed: ${err.message}. Trying next provider...`
      );
    }
  }

  throw new ProviderUnavailableError(
    `All AI providers failed. Last error: ${lastError?.message ?? "Unknown"}`
  );
}

async function executeWithRetry(
  provider: AIProvider,
  prompt: string,
  options?: RequestOptions,
  maxRetries = 2
): Promise<AIResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await provider.generateText(prompt, options);
    } catch (err: any) {
      const isTransient =
        err instanceof RateLimitError ||
        err instanceof TimeoutError ||
        err instanceof ProviderUnavailableError;

      // Non-transient errors (auth, validation) bubble up immediately
      if (!isTransient || attempt === maxRetries) throw err;

      const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
      console.warn(
        `[AI Router] ${provider.name} attempt ${attempt} failed (transient). ` +
        `Retrying in ${delayMs}ms...`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new ProviderUnavailableError(`${provider.name} failed after ${maxRetries} retries.`);
}

export { AIResponse, RequestOptions };
```

### 6.8 Create `backend/src/services/prompts.ts`

Move the prompts from `extension/src/ai/prompts.ts` to here. They MUST be server-side only — expose them to the client and you reveal your prompt engineering to anyone who reads the extension's source.

```typescript
// backend/src/services/prompts.ts
// These prompts live on the server only. Never expose to the client.

export const RESUME_PARSE_PROMPT = (resumeText: string): string => `
You are a professional resume parser. Extract all information from the resume text below and return ONLY a valid JSON object.

RULES:
- Return ONLY raw JSON. No markdown code blocks, no explanation, no extra text.
- If a field is missing, use an empty string "" or empty array [].
- Extract all skills as a flat string array.
- For dates, use "Month Year" format where possible (e.g., "Jan 2022").
- Keep descriptions concise but informative.

REQUIRED JSON SCHEMA (return exactly this structure):
{
  "personalInfo": {
    "name": "", "email": "", "phone": "", "location": "",
    "website": "", "linkedin": "", "github": "", "summary": ""
  },
  "education": [{ "institution": "", "degree": "", "field": "", "startDate": "", "endDate": "", "gpa": "", "description": "" }],
  "experience": [{ "company": "", "title": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "", "highlights": [] }],
  "projects": [{ "name": "", "description": "", "url": "", "technologies": [], "startDate": "", "endDate": "" }],
  "skills": [],
  "certifications": [{ "name": "", "issuer": "", "date": "", "url": "" }],
  "links": { "linkedin": "", "github": "", "portfolio": "", "twitter": "" },
  "resumeText": ""
}

RESUME TEXT:
${resumeText}

Return ONLY the JSON object.
`;

export const AUTOFILL_MAPPING_PROMPT = (
  profileJson: string,
  fieldsJson: string
): string => `
You are an intelligent job application form filler. Given the user's profile and a list of form fields, return a JSON object mapping each field's name/id to the best matching value from the profile.

RULES:
- Return ONLY raw JSON. No markdown, no explanation, no extra text.
- Use the field's name or id as the key.
- Match fields intelligently — e.g., "first_name" maps to personalInfo.name.split()[0]
- For selects/dropdowns, match the value to the closest available option.
- For checkboxes (e.g., "I agree to terms"), use "true".
- If a field has no relevant match, use an empty string "".
- Never invent information not present in the profile.
- Format phone numbers appropriately for the field context.

USER PROFILE:
${profileJson}

FORM FIELDS (array of {id, name, type, label, placeholder, ariaLabel, options}):
${fieldsJson}

Return ONLY a JSON object like: { "fieldName_or_id": "value", ... }
`;
```

### 6.9 Acceptance Criteria for Step 6

- [ ] All 4 provider files exist in `backend/src/services/providers/`
- [ ] `aiRouter.ts` exists and exports `generateText()`
- [ ] `prompts.ts` exists in backend only
- [ ] The AI router correctly falls through providers on failure
- [ ] `extension/src/ai/prompts.ts` is marked for deletion (done in Step 9)

---

## STEP 7: REST API Endpoints

### 7.1 Create `backend/src/routes/resume.ts`

```typescript
// backend/src/routes/resume.ts
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { generateText } from "../services/aiRouter.js";
import { RESUME_PARSE_PROMPT } from "../services/prompts.js";
import pdfParse from "pdf-parse";

function safeParseJSON<T>(raw: string): T {
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(clean) as T;
}

export async function resumeRoutes(fastify: FastifyInstance) {
  // POST /api/v1/resume/upload
  // Accepts a PDF file, extracts text, calls AI, returns parsed UserProfile.
  // Rate limited to 10 requests per hour (AI is expensive).
  fastify.post("/upload", {
    preHandler: [requireAuth],
    config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded." });
    }

    const filename = data.filename ?? "";
    if (data.mimetype !== "application/pdf" && !filename.toLowerCase().endsWith(".pdf")) {
      return reply.status(400).send({ error: "Only PDF files are accepted." });
    }

    // Buffer the entire file into memory
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > 10 * 1024 * 1024) {
      return reply.status(413).send({ error: "File exceeds 10 MB limit." });
    }

    // Extract text from PDF server-side
    let resumeText: string;
    try {
      const parsed = await pdfParse(buffer);
      resumeText = parsed.text.trim();
    } catch {
      return reply.status(422).send({
        error: "Failed to extract text from PDF. The file may be corrupted or image-based.",
      });
    }

    if (!resumeText || resumeText.length < 50) {
      return reply.status(422).send({
        error: "Could not extract meaningful text from this PDF.",
      });
    }

    // AI parsing with retry
    const MAX_RETRIES = 3;
    let profile: unknown = null;
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const prompt = RESUME_PARSE_PROMPT(resumeText);
        const aiResponse = await generateText(prompt, { temperature: 0.1 });
        profile = safeParseJSON(aiResponse.text);

        if (typeof profile !== "object" || profile === null || !(profile as any).personalInfo) {
          throw new Error("Invalid profile structure from AI.");
        }

        (profile as any).resumeText = resumeText;
        break;
      } catch (err: any) {
        lastError = err.message;
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    if (!profile) {
      return reply.status(500).send({
        error: `Failed to analyze resume after ${MAX_RETRIES} attempts. ${lastError}`,
      });
    }

    return reply.status(200).send({
      message: "Resume analyzed successfully.",
      profile,
    });
  });

  // POST /api/v1/resume/analyze
  // Re-analyze from already-extracted resume text (avoids re-uploading the PDF).
  fastify.post("/analyze", {
    preHandler: [requireAuth],
    config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const body = request.body as { resumeText?: string };
    if (!body?.resumeText || body.resumeText.trim().length < 50) {
      return reply.status(400).send({
        error: "resumeText is required and must be at least 50 characters.",
      });
    }

    try {
      const prompt = RESUME_PARSE_PROMPT(body.resumeText);
      const aiResponse = await generateText(prompt, { temperature: 0.1 });
      const profile = safeParseJSON(aiResponse.text);
      return reply.send({ message: "Resume analyzed.", profile });
    } catch (err: any) {
      return reply.status(500).send({ error: `Analysis failed: ${err.message}` });
    }
  });
}
```

### 7.2 Create `backend/src/routes/ai.ts`

```typescript
// backend/src/routes/ai.ts
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { generateText } from "../services/aiRouter.js";
import { AUTOFILL_MAPPING_PROMPT } from "../services/prompts.js";
import { z } from "zod";

const fieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  label: z.string().optional().default(""),
  placeholder: z.string().optional().default(""),
  ariaLabel: z.string().optional().default(""),
  options: z.array(z.string()).optional(),
});

const autofillSchema = z.object({
  profile: z.object({
    personalInfo: z.object({}).passthrough(),
    experience: z.array(z.object({}).passthrough()).default([]),
    education: z.array(z.object({}).passthrough()).default([]),
    skills: z.array(z.string()).default([]),
    projects: z.array(z.object({}).passthrough()).default([]),
    certifications: z.array(z.object({}).passthrough()).default([]),
    links: z.object({}).passthrough().optional(),
  }),
  fields: z.array(fieldSchema).min(1, "At least one form field is required."),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.string().max(8000).optional(),
});

export async function aiRoutes(fastify: FastifyInstance) {
  // POST /api/v1/ai/autofill
  // Accepts: UserProfile + FormField[]. Returns: AutofillMapping.
  // This is the core endpoint called by the extension during autofill.
  fastify.post("/autofill", {
    preHandler: [requireAuth],
    config: { rateLimit: { max: 50, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const result = autofillSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: "Validation Error",
        details: result.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const { profile, fields } = result.data;

    // Strip resumeText — reduces token count
    const profileForAI = { ...profile, resumeText: undefined };
    const fieldSummary = fields.map((f) => ({
      id: f.id, name: f.name, type: f.type,
      label: f.label, placeholder: f.placeholder,
      ariaLabel: f.ariaLabel, options: f.options,
    }));

    const MAX_RETRIES = 3;
    let mapping: Record<string, string> | null = null;
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const prompt = AUTOFILL_MAPPING_PROMPT(
          JSON.stringify(profileForAI, null, 2),
          JSON.stringify(fieldSummary, null, 2)
        );
        const aiResponse = await generateText(prompt, { temperature: 0.1 });
        const raw = aiResponse.text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/i, "")
          .trim();
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("AI returned non-object mapping.");
        }
        mapping = parsed;
        break;
      } catch (err: any) {
        lastError = err.message;
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    if (!mapping) {
      return reply.status(500).send({
        error: `Failed to generate mapping after ${MAX_RETRIES} attempts. ${lastError}`,
      });
    }

    return reply.send({ mapping });
  });

  // POST /api/v1/ai/chat — general AI chat for future features
  fastify.post("/chat", {
    preHandler: [requireAuth],
    config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const result = chatSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: "message is required (max 4000 chars).",
      });
    }

    const { message, context } = result.data;
    const prompt = context ? `Context:\n${context}\n\nUser: ${message}` : message;

    try {
      const aiResponse = await generateText(prompt, { temperature: 0.7 });
      return reply.send({
        text: aiResponse.text,
        provider: aiResponse.provider,
        model: aiResponse.model,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: `AI request failed: ${err.message}` });
    }
  });
}
```

### 7.3 Create `backend/src/routes/user.ts`

```typescript
// backend/src/routes/user.ts
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/v1/user/profile
  fastify.get("/profile", { preHandler: [requireAuth] }, async (request, reply) => {
    return reply.send({
      id: request.user.userId,
      email: request.user.email,
      plan: "free",
      credits: 100, // TODO: fetch from database
    });
  });

  // GET /api/v1/user/credits
  fastify.get("/credits", { preHandler: [requireAuth] }, async (request, reply) => {
    return reply.send({
      userId: request.user.userId,
      credits: 100,
      plan: "free",
    });
  });

  // POST /api/v1/settings
  fastify.post("/settings", { preHandler: [requireAuth] }, async (request, reply) => {
    // Placeholder — save user settings when database is added
    return reply.send({ message: "Settings saved." });
  });
}
```

### 7.4 Create `backend/src/routes/jobs.ts`

```typescript
// backend/src/routes/jobs.ts
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const parseFormSchema = z.object({
  pageUrl: z.string().url(),
  fields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    label: z.string().optional().default(""),
    placeholder: z.string().optional().default(""),
    ariaLabel: z.string().optional().default(""),
    options: z.array(z.string()).optional(),
  })),
});

export async function jobRoutes(fastify: FastifyInstance) {
  // POST /api/v1/jobs/autofill — alias redirecting to /api/v1/ai/autofill
  fastify.post("/autofill", { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.status(308).redirect("/api/v1/ai/autofill");
  });

  // POST /api/v1/forms/parse — classify a detected form
  fastify.post("/forms/parse", { preHandler: [requireAuth] }, async (request, reply) => {
    const result = parseFormSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: "Invalid request body." });
    }
    // Future: classify as greenhouse/lever/ashby/workable/generic
    return reply.send({
      formType: "generic",
      fieldCount: result.data.fields.length,
      pageUrl: result.data.pageUrl,
    });
  });
}
```

### 7.5 Complete REST API Reference

All endpoints below require `Authorization: Bearer <access_token>` unless marked (public).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | Public | Health check |
| POST | /api/v1/auth/register | Public | Create account |
| POST | /api/v1/auth/login | Public | Get tokens |
| POST | /api/v1/auth/refresh | Public | Refresh access token |
| POST | /api/v1/auth/logout | JWT | Logout |
| POST | /api/v1/resume/upload | JWT | Upload PDF, parse profile |
| POST | /api/v1/resume/analyze | JWT | Re-analyze from text |
| POST | /api/v1/ai/autofill | JWT | Generate form mapping |
| POST | /api/v1/ai/chat | JWT | General AI chat |
| GET | /api/v1/user/profile | JWT | Get user info |
| GET | /api/v1/user/credits | JWT | Get credit balance |
| POST | /api/v1/user/settings | JWT | Save settings |
| POST | /api/v1/forms/parse | JWT | Classify a form |

### 7.6 Acceptance Criteria for Step 7

- [ ] All route files compile without TypeScript errors
- [ ] `POST /api/v1/resume/upload` with a real PDF returns a valid UserProfile
- [ ] `POST /api/v1/ai/autofill` returns a mapping for test input
- [ ] All authenticated routes return 401 when JWT is missing
- [ ] All authenticated routes return 401 when JWT is invalid or expired
- [ ] Rate limits per route are active

---

## STEP 8: Backend Security Hardening

### 8.1 Create `backend/.env.example`

This file is committed to git. It documents all required variables but contains NO real values.

```env
# ApplyOnce AI Backend — Environment Variables
# Copy this file to .env and fill in real values.
# NEVER commit the .env file.

# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# JWT Secrets
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Access and refresh must use DIFFERENT secrets.
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_HEX
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_64_CHAR_RANDOM_HEX
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI Provider Keys — at least ONE required
GOOGLE_API_KEY=
GROQ_API_KEY=
CEREBRAS_API_KEY=
OPENROUTER_API_KEY=

# CORS — comma-separated list of allowed origins
# Include your Chrome extension ID: chrome-extension://EXTENSION_ID
ALLOWED_ORIGINS=http://localhost:5173,chrome-extension://

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Optional: Database (for user persistence beyond in-memory)
DATABASE_URL=

# Optional: Redis (for distributed rate limiting in production)
REDIS_URL=
```

### 8.2 Create `backend/.env` Locally

Copy `.env.example` to `.env` and fill in:
- Fresh AI API keys (the ones you generated in Step 2, not the revoked ones)
- JWT secrets generated with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `ALLOWED_ORIGINS` including `chrome-extension://` (wildcard for development)

Verify `backend/.env` is in `backend/.gitignore` (or root `.gitignore`).

### 8.3 Security Checklist Verification

Verify every item is implemented before proceeding:

| Feature | Implementation Location | Verified? |
|---------|------------------------|-----------|
| HTTP security headers (XSS, clickjacking) | `@fastify/helmet` in `index.ts` | [ ] |
| CORS origin whitelist | `@fastify/cors` in `index.ts` | [ ] |
| Rate limiting (global 100 req/min) | `@fastify/rate-limit` in `index.ts` | [ ] |
| Stricter rate limits per AI endpoint | Route `config.rateLimit` in each route | [ ] |
| JWT access tokens (15 min) | `jwtService.ts` + `requireAuth` | [ ] |
| JWT refresh tokens (7 days) | `jwtService.ts` auth routes | [ ] |
| Input validation with Zod | All POST routes | [ ] |
| File upload size limit (10 MB) | `@fastify/multipart` in `index.ts` | [ ] |
| Bcrypt password hashing (cost 12) | `auth.ts` register route | [ ] |
| Constant-time password comparison | `auth.ts` login route (dummy hash pattern) | [ ] |
| Error message sanitization in prod | `errorHandler.ts` | [ ] |
| Secrets in environment only | `config/env.ts` — no `process.env` elsewhere | [ ] |
| No secrets in logs | pino logger does not log request bodies by default | [ ] |
| Request ID tracking | `genReqId` in `index.ts` | [ ] |
| HTTPS enforcement | Handled by Railway/Render deployment (auto-TLS) | [ ] |

### 8.4 Acceptance Criteria for Step 8

- [ ] `backend/.env.example` committed (no real values)
- [ ] `backend/.env` exists locally with real values (NOT committed)
- [ ] All checklist items verified
- [ ] Server starts and all routes are accessible

---

## STEP 9: Extension Refactor

### 9.1 Overview

This is the most important step. The extension must:

**DELETE** (removes all secret access from extension):
- `extension/src/lib/ai/` — entire directory (8 files)
- `extension/src/ai/prompts.ts`
- `extension/.env` (replaced with `.env.example` containing only `VITE_API_URL`)

**CREATE** (new secure files):
- `extension/src/storage/authStorage.ts` — JWT token storage in chrome.storage
- `extension/src/lib/apiClient.ts` — authenticated fetch wrapper (JWT only, no AI keys)
- `extension/src/hooks/useAuth.ts` — auth state management

**REFACTOR** (same interface, new internals):
- `extension/src/services/geminiService.ts` — now calls backend instead of AI directly

**UPDATE** (security hardening):
- `extension/manifest.json` — restrict host_permissions to backend URL only

**KEEP UNCHANGED**:
- `extension/src/services/pdfService.ts`
- `extension/src/content/content.ts`
- `extension/src/background/background.ts`
- `extension/src/storage/profileStorage.ts`
- `extension/src/hooks/useProfile.ts`
- `extension/src/hooks/useAutofill.ts` (mostly unchanged — service interface is preserved)
- `extension/src/components/` (all UI components)

### 9.2 Delete AI Provider Directory

Delete these files and the directory:

```
extension/src/lib/ai/gemini.ts
extension/src/lib/ai/groq.ts
extension/src/lib/ai/cerebras.ts
extension/src/lib/ai/openrouter.ts
extension/src/lib/ai/provider.ts
extension/src/lib/ai/fallback.ts
extension/src/lib/ai/index.ts
extension/src/lib/ai/types.ts
```

Also delete:
```
extension/src/ai/prompts.ts
extension/.env
```

### 9.3 Create `extension/.env.example`

```env
# ApplyOnce AI Extension — Environment Variables
# This file is committed. Copy to .env for local development.
# DO NOT add AI provider keys here. They belong in the backend.

# URL of the ApplyOnce backend API
# Production: https://api.applyonce.ai
# Development: http://localhost:3001
VITE_API_URL=https://api.applyonce.ai
```

For local development, create `extension/.env` (NOT committed):
```env
VITE_API_URL=http://localhost:3001
```

### 9.4 Create `extension/src/storage/authStorage.ts`

```typescript
// extension/src/storage/authStorage.ts
// Stores JWT tokens in chrome.storage.local.
// chrome.storage.local is encrypted per Chrome profile — safer than localStorage.
// These are USER session tokens, NOT AI API keys.

const ACCESS_TOKEN_KEY = "ao_access_token";
const REFRESH_TOKEN_KEY = "ao_refresh_token";
const USER_KEY = "ao_user";

export interface StoredUser {
  id: string;
  email: string;
  credits: number;
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [ACCESS_TOKEN_KEY]: accessToken, [REFRESH_TOKEN_KEY]: refreshToken },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

export async function getAccessToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([ACCESS_TOKEN_KEY], (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result[ACCESS_TOKEN_KEY] ?? null);
    });
  });
}

export async function getRefreshToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([REFRESH_TOKEN_KEY], (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result[REFRESH_TOKEN_KEY] ?? null);
    });
  });
}

export async function saveUser(user: StoredUser): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [USER_KEY]: user }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

export async function getUser(): Promise<StoredUser | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([USER_KEY], (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result[USER_KEY] ?? null);
    });
  });
}

export async function clearAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY], () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}
```

### 9.5 Create `extension/src/lib/apiClient.ts`

```typescript
// extension/src/lib/apiClient.ts
// Authenticated HTTP client for the ApplyOnce backend.
// ALL requests from the extension to the backend go through this module.
// NEVER add AI provider API keys here. JWT tokens only.

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "../storage/authStorage.js";

const API_URL = (import.meta.env.VITE_API_URL as string) ?? "";

if (!API_URL) {
  console.error("[ApplyOnce] VITE_API_URL is not configured.");
}

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/**
 * Makes an authenticated request to the backend.
 * Automatically refreshes the access token if it receives TOKEN_EXPIRED.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  // If access token expired, try to refresh it and retry the request once
  if (response.status === 401) {
    const body = await response.json().catch(() => ({})) as {
      code?: string;
      message?: string;
    };

    if (body.code === "TOKEN_EXPIRED") {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(options.headers as Record<string, string> ?? {}),
        };
        const retry = await fetch(`${API_URL}${path}`, {
          ...options,
          headers: retryHeaders,
        });
        if (retry.ok) return retry.json() as Promise<T>;
      }
    }

    throw new ApiRequestError(401, body.message ?? "Unauthorized. Please log in.", body.code);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText })) as {
      message?: string;
      code?: string;
    };
    throw new ApiRequestError(response.status, body.message ?? "Request failed", body.code);
  }

  return response.json() as Promise<T>;
}

/**
 * Uploads a file to the backend with JWT authentication.
 * Used for PDF resume uploads.
 */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const accessToken = await getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText })) as {
      message?: string;
    };
    throw new ApiRequestError(response.status, body.message ?? "Upload failed");
  }

  return response.json() as Promise<T>;
}

/**
 * Attempts to get a new access token using the stored refresh token.
 * Returns the new access token or null if refresh fails.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;

    const data = await response.json() as {
      accessToken: string;
      refreshToken: string;
    };
    await saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}
```

### 9.6 Refactor `extension/src/services/geminiService.ts`

Replace the entire file content. The function signatures stay the same so `useAutofill.ts` and `ResumeUpload.tsx` do not need changes (they import these functions by name).

```typescript
// extension/src/services/geminiService.ts
// ─────────────────────────────────────────────
//  ApplyOnce AI – Backend API Service
//
//  This file previously called AI providers directly using embedded API keys.
//  It now calls the ApplyOnce backend API using JWT authentication.
//
//  NO AI API KEYS exist in this file or anywhere in the extension.
//  The backend holds all provider keys securely.
// ─────────────────────────────────────────────
import { apiRequest, uploadFile } from "@/lib/apiClient";
import type { UserProfile, FormField, AutofillMapping } from "@/types";

interface ResumeUploadResponse {
  message: string;
  profile: UserProfile;
}

interface ResumeAnalyzeResponse {
  message: string;
  profile: UserProfile;
}

interface AutofillResponse {
  mapping: AutofillMapping;
}

/**
 * Parses resume text into a structured UserProfile.
 *
 * If `input` is a File, it uploads the PDF to the backend (server-side PDF extraction + AI).
 * If `input` is a string, it sends the extracted text to the backend for AI parsing.
 *
 * The function name is preserved for backward compatibility.
 */
export async function parseResumeToProfile(
  input: File | string
): Promise<UserProfile> {
  let response: ResumeUploadResponse | ResumeAnalyzeResponse;

  if (input instanceof File) {
    // Upload PDF directly — backend handles extraction and AI parsing
    response = await uploadFile<ResumeUploadResponse>("/api/v1/resume/upload", input);
  } else {
    // Send extracted text — backend handles AI parsing
    response = await apiRequest<ResumeAnalyzeResponse>("/api/v1/resume/analyze", {
      method: "POST",
      body: JSON.stringify({ resumeText: input }),
    });
  }

  if (!response.profile?.personalInfo) {
    throw new Error("Backend returned an invalid profile structure.");
  }

  return response.profile;
}

/**
 * Generates an autofill mapping from a profile and detected form fields.
 *
 * The function signature is preserved for backward compatibility with useAutofill.ts.
 * Internally, this now calls the backend instead of calling AI providers directly.
 */
export async function generateAutofillMapping(
  profile: UserProfile,
  fields: FormField[]
): Promise<AutofillMapping> {
  if (fields.length === 0) return {};

  // Strip resumeText to reduce payload size
  const profileForBackend = { ...profile, resumeText: undefined };

  const response = await apiRequest<AutofillResponse>("/api/v1/ai/autofill", {
    method: "POST",
    body: JSON.stringify({ profile: profileForBackend, fields }),
  });

  if (!response.mapping || typeof response.mapping !== "object") {
    throw new Error("Backend returned an invalid autofill mapping.");
  }

  return response.mapping;
}
```

### 9.7 Create `extension/src/hooks/useAuth.ts`

```typescript
// extension/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import {
  getUser, saveUser, saveTokens, clearAuth,
  type StoredUser,
} from "@/storage/authStorage";
import { apiRequest } from "@/lib/apiClient";

interface AuthResponse {
  message: string;
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UseAuthReturn {
  user: StoredUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await saveTokens(data.accessToken, data.refreshToken);
    await saveUser(data.user);
    setUser(data.user);
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    name?: string
  ) => {
    const data = await apiRequest<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    await saveTokens(data.accessToken, data.refreshToken);
    await saveUser(data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setUser(null);
  }, []);

  return { user, isAuthenticated: !!user, loading, login, register, logout };
}
```

### 9.8 Update `extension/manifest.json`

Change `host_permissions` from `<all_urls>` to only the backend URL. The extension's content scripts still run on all URLs (needed to detect and fill forms on job sites), but the extension may only make fetch requests to the backend.

```json
{
  "manifest_version": 3,
  "name": "ApplyOnce AI",
  "version": "1.1.0",
  "description": "Upload your resume once. AI fills every job application automatically.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "ApplyOnce AI"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage", "activeTab", "scripting", "tabs"],
  "host_permissions": [
    "https://api.applyonce.ai/*",
    "http://localhost:3001/*"
  ],
  "options_page": "options.html",
  "web_accessible_resources": [
    {
      "resources": ["icons/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 9.9 Handle the Resume Upload Flow Change

In `extension/src/components/ResumeUpload.tsx`, find the call to `parseResumeToProfile`. There are two valid approaches:

**Approach A (recommended) — Send text to backend (privacy-preserving):**
Keep `pdfService.extractTextFromPDF(file)` client-side (existing behavior). Then call `parseResumeToProfile(extractedText)` with the string. This sends only text to the backend, not the raw PDF.

```typescript
// ResumeUpload.tsx — no change needed if geminiService.parseResumeToProfile(text: string) is called
const text = await extractTextFromPDF(file);         // client-side
const profile = await parseResumeToProfile(text);    // calls backend with text
```

**Approach B — Upload PDF directly:**
Remove `extractTextFromPDF` and pass the `File` object directly. The backend handles both extraction and parsing.

```typescript
const profile = await parseResumeToProfile(file);   // uploads PDF, backend extracts + parses
```

The updated `geminiService.parseResumeToProfile` supports both a `File` and a `string` as input. Review `ResumeUpload.tsx` and determine which approach is currently used, then update accordingly. Approach A is recommended as it reduces payload size and keeps PDF binary data client-side.

### 9.10 Verify Extension Build

After all changes:

```bash
cd extension
npm run build

# After build, scan dist/ for any secrets
# ALL of these should return 0 results:
grep -r "AIza" dist/
grep -r "gsk_" dist/
grep -r "csk-" dist/
grep -r "sk-or-v1-" dist/
grep -r "GEMINI_API_KEY" dist/
grep -r "GROQ_API_KEY" dist/
grep -r "CEREBRAS_API_KEY" dist/
grep -r "OPENROUTER_API_KEY" dist/
grep -r "generativelanguage.googleapis.com" dist/
grep -r "api.groq.com" dist/
grep -r "api.cerebras.ai" dist/
grep -r "openrouter.ai" dist/
```

### 9.11 Acceptance Criteria for Step 9

- [ ] `extension/src/lib/ai/` directory does not exist
- [ ] `extension/src/ai/prompts.ts` does not exist
- [ ] `extension/.env` does not contain any AI provider keys
- [ ] `extension/src/lib/apiClient.ts` exists and sends JWT only
- [ ] `extension/src/storage/authStorage.ts` exists
- [ ] `extension/src/services/geminiService.ts` calls backend endpoints, not AI APIs
- [ ] `extension/src/hooks/useAuth.ts` exists
- [ ] `extension/manifest.json` host_permissions is restricted to backend URL only
- [ ] `npm run build` in extension/ completes without TypeScript errors
- [ ] All grep scans of `extension/dist/` return 0 results

---

## STEP 10: Frontend Migration

The Lovable/TanStack frontend at the project root is primarily a marketing site and web dashboard. It currently does not appear to call AI providers directly. However, verify this before proceeding.

### 10.1 Search for AI Calls in Frontend

```bash
grep -r "GEMINI_API_KEY\|GROQ_API_KEY\|CEREBRAS_API_KEY\|OPENROUTER_API_KEY" src/
grep -r "generativelanguage.googleapis.com\|api.groq.com\|api.cerebras.ai\|openrouter.ai" src/
grep -r "@google/generative-ai\|groq-sdk\|cerebras" src/
```

If any results are found, refactor them to call the backend using the same JWT pattern as the extension.

### 10.2 Update Frontend Environment

The frontend's `.env` (at the workspace root) should only contain:

```env
VITE_API_URL=https://api.applyonce.ai
```

Never:
```env
VITE_GEMINI_API_KEY=...   # FORBIDDEN
```

### 10.3 Acceptance Criteria for Step 10

- [ ] Zero AI provider references in `src/` source code
- [ ] Root `.env` contains only `VITE_API_URL`
- [ ] Frontend builds without errors (`npm run build` at workspace root)

---

## STEP 11: Environment Variables and Secrets

### 11.1 Complete Environment Variable Inventory

| Variable | Location | Who Reads It | Committed to Git? |
|----------|----------|-------------|-------------------|
| `GOOGLE_API_KEY` | `backend/.env` | Backend only | NEVER |
| `GROQ_API_KEY` | `backend/.env` | Backend only | NEVER |
| `CEREBRAS_API_KEY` | `backend/.env` | Backend only | NEVER |
| `OPENROUTER_API_KEY` | `backend/.env` | Backend only | NEVER |
| `JWT_SECRET` | `backend/.env` | Backend only | NEVER |
| `JWT_REFRESH_SECRET` | `backend/.env` | Backend only | NEVER |
| `DATABASE_URL` | `backend/.env` | Backend only | NEVER |
| `VITE_API_URL` | `extension/.env`, root `.env` | Extension, Frontend | Only `.env.example` |

### 11.2 GitHub Actions Secrets

Configure these in GitHub repository Settings → Secrets and Variables → Actions:

```
BACKEND_GOOGLE_API_KEY
BACKEND_GROQ_API_KEY
BACKEND_CEREBRAS_API_KEY
BACKEND_OPENROUTER_API_KEY
BACKEND_JWT_SECRET
BACKEND_JWT_REFRESH_SECRET
RAILWAY_TOKEN
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

### 11.3 Acceptance Criteria for Step 11

- [ ] All secrets are in `backend/.env` only (not committed)
- [ ] All `.env.example` files are committed and contain no real values
- [ ] GitHub Actions secrets are configured for all deployment tokens

---

## STEP 12: Extension Build and Packaging

### 12.1 Create `extension/scripts/build-extension.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Building ApplyOnce AI Extension..."

cd "$(dirname "$0")/.."

# Step 1: Verify .env exists
if [ ! -f ".env" ]; then
  echo "ERROR: .env not found. Create it from .env.example with VITE_API_URL set."
  exit 1
fi

# Step 2: Verify VITE_API_URL is set
if ! grep -q "VITE_API_URL=http" .env; then
  echo "ERROR: VITE_API_URL is not set in extension/.env."
  exit 1
fi

# Step 3: Verify NO AI keys are in .env
for key in GEMINI_API_KEY GROQ_API_KEY CEREBRAS_API_KEY OPENROUTER_API_KEY; do
  if grep -q "$key=" .env; then
    echo "SECURITY ERROR: $key found in extension .env. Remove it before building."
    exit 1
  fi
done

# Step 4: Build
npm run build

# Step 5: Scan the built output for secrets
echo "Scanning dist/ for secrets..."

SECRET_PATTERNS=(
  "AIza"
  "gsk_"
  "csk-"
  "sk-or-v1-"
  "GEMINI_API_KEY"
  "GROQ_API_KEY"
  "CEREBRAS_API_KEY"
  "OPENROUTER_API_KEY"
  "generativelanguage.googleapis.com"
  "api.groq.com"
  "api.cerebras.ai"
  "openrouter.ai"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -r "$pattern" dist/ --include="*.js" 2>/dev/null | grep -qv "//"; then
    echo "SECURITY VIOLATION: Pattern '$pattern' found in dist/. Aborting."
    rm -rf dist/
    exit 1
  fi
done

echo "Security scan passed. No secrets in build output."

# Step 6: Create zip
VERSION=$(node -p "require('./package.json').version")
ZIP_NAME="applyonce-extension-v${VERSION}.zip"

cd dist
zip -r "../$ZIP_NAME" . -x "*.map" -x "*.d.ts"
cd ..

echo "Extension packaged: $ZIP_NAME"
echo "Size: $(du -sh "$ZIP_NAME" | cut -f1)"
echo "READY to upload to Chrome Web Store."
```

### 12.2 Add Build Script to `extension/package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "build:prod": "bash scripts/build-extension.sh",
    "dev": "vite"
  }
}
```

### 12.3 Acceptance Criteria for Step 12

- [ ] `bash extension/scripts/build-extension.sh` completes without errors
- [ ] Output zip contains no secrets (verified by the script's own scan)
- [ ] Zip can be loaded in Chrome as an extension
- [ ] End-to-end: Install zip → Login → Upload resume → Autofill a form

---

## STEP 13: CI/CD Pipeline

### 13.1 Create `.github/workflows/security-scan.yml`

```yaml
name: Security Scan

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main, develop]

jobs:
  gitleaks:
    name: Gitleaks Secret Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  extension-dist-scan:
    name: Scan Extension Build Output
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Check if dist exists and scan
        run: |
          if [ -d "extension/dist" ]; then
            patterns=("AIza" "gsk_" "csk-" "sk-or-v1-" "GEMINI_API_KEY" "GROQ_API_KEY" "CEREBRAS_API_KEY" "OPENROUTER_API_KEY")
            for p in "${patterns[@]}"; do
              if grep -r "$p" extension/dist/ --include="*.js" 2>/dev/null; then
                echo "FAIL: Secret pattern '$p' found in extension/dist/"
                exit 1
              fi
            done
            echo "PASS: No secrets in extension/dist/"
          else
            echo "SKIP: extension/dist/ not found (not built yet)"
          fi
```

### 13.2 Create `.github/workflows/build-extension.yml`

```yaml
name: Build and Package Extension

on:
  push:
    branches: [main]
    paths: ["extension/**"]
  workflow_dispatch:

jobs:
  build:
    name: Build Extension
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: extension/package-lock.json

      - name: Install dependencies
        working-directory: extension
        run: npm ci

      - name: Create production .env (only VITE_API_URL, no AI keys)
        working-directory: extension
        run: echo "VITE_API_URL=https://api.applyonce.ai" > .env

      - name: Build
        working-directory: extension
        run: npm run build

      - name: Scan for secrets
        working-directory: extension
        run: |
          patterns=("AIza" "gsk_" "csk-" "sk-or-v1-" "GEMINI_API_KEY" "GROQ_API_KEY" "CEREBRAS_API_KEY" "OPENROUTER_API_KEY" "generativelanguage.googleapis.com" "api.groq.com")
          for p in "${patterns[@]}"; do
            if grep -r "$p" dist/ --include="*.js" 2>/dev/null; then
              echo "FAIL: '$p' found in dist/"
              exit 1
            fi
          done
          echo "PASS: No secrets in build"

      - name: Package
        working-directory: extension
        run: |
          VERSION=$(node -p "require('./package.json').version")
          cd dist && zip -r "../applyonce-extension-v${VERSION}.zip" . -x "*.map"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-zip
          path: extension/applyonce-extension-*.zip
          retention-days: 30
```

### 13.3 Create `.github/workflows/deploy-backend.yml`

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths: ["backend/**"]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Railway
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy
        working-directory: backend
        run: railway up --service applyonce-backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 13.4 Acceptance Criteria for Step 13

- [ ] Gitleaks runs on every push and fails if secrets are detected
- [ ] Extension builds and packages on push to `main`
- [ ] Backend deploys automatically on push to `main`
- [ ] No secrets in any workflow file — all values from GitHub Secrets

---

## STEP 14: Deployment Guide

### 14.1 Backend Deployment — Railway (Recommended)

**Why Railway over alternatives:**
- **Railway**: Best for Node.js/TypeScript. Zero-config deployment from git. Built-in environment variable management. Auto-HTTPS with custom domains. ~$5/month for MVP scale. No Docker required.
- **Render**: Similar but slightly slower cold starts on free tier. Good alternative.
- **Cloud Run**: Google's serverless containers. Most scalable, best for >10k users/day. Requires Docker setup. More complex.

**Use Railway for MVP. Migrate to Cloud Run when traffic justifies it.**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# From backend directory — initialize and deploy
cd backend
railway init
railway up

# Set secrets via Railway CLI (NEVER hardcode in config files)
railway variables set GOOGLE_API_KEY="your_fresh_key"
railway variables set GROQ_API_KEY="your_fresh_key"
railway variables set CEREBRAS_API_KEY="your_fresh_key"
railway variables set OPENROUTER_API_KEY="your_fresh_key"
railway variables set JWT_SECRET="$(node -e 'console.log(require("crypto").randomBytes(64).toString("hex"))')"
railway variables set JWT_REFRESH_SECRET="$(node -e 'console.log(require("crypto").randomBytes(64).toString("hex"))')"
railway variables set NODE_ENV="production"
railway variables set ALLOWED_ORIGINS="https://applyonce.ai,chrome-extension://YOUR_EXTENSION_ID"

# Railway auto-generates a domain: applyonce-backend.up.railway.app
# Set your custom domain: api.applyonce.ai → applyonce-backend.up.railway.app
```

### 14.2 Frontend Deployment — Vercel

The Lovable frontend auto-deploys via the Lovable integration. Set this environment variable in the Vercel dashboard:

```
VITE_API_URL = https://api.applyonce.ai
```

### 14.3 Extension Distribution

1. Build: `cd extension && npm run build:prod`
2. The resulting `applyonce-extension-vX.Y.Z.zip` contains no secrets
3. Upload to Chrome Web Store Developer Dashboard at https://chrome.google.com/webstore/devconsole
4. In the Chrome Web Store listing, the extension's `manifest.json` restricts network access to `api.applyonce.ai` only

### 14.4 Acceptance Criteria for Step 14

- [ ] `GET https://api.applyonce.ai/health` returns `{"status":"ok"}`
- [ ] Frontend loads at production URL
- [ ] Extension zip is uploaded to Chrome Web Store (or ready for upload)
- [ ] End-to-end test: Install extension → Register → Upload resume → Autofill a job form

---

## STEP 15: Testing Guide

### 15.1 Backend API Tests (Manual)

```bash
BASE=https://api.applyonce.ai
# or http://localhost:3001 for local

# Health check
curl "$BASE/health"
# Expected: {"status":"ok","version":"1.0.0","timestamp":"..."}

# Register
curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","name":"Test"}' | jq .
# Expected: 201, accessToken, refreshToken

# Login with wrong password
curl -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpass"}'
# Expected: 401

# Login correctly and capture token
ACCESS=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}' | jq -r '.accessToken')

# Authenticated request
curl "$BASE/api/v1/user/profile" -H "Authorization: Bearer $ACCESS"
# Expected: 200, user data

# Unauthenticated request
curl "$BASE/api/v1/user/profile"
# Expected: 401

# AI Autofill
curl -s -X POST "$BASE/api/v1/ai/autofill" \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "personalInfo": {"name":"John Doe","email":"john@example.com","phone":"555-0100"},
      "experience": [], "education": [], "skills": ["TypeScript"],
      "projects": [], "certifications": [], "links": {}
    },
    "fields": [
      {"id":"fname","name":"first_name","type":"text","label":"First Name","placeholder":"","ariaLabel":"First Name"}
    ]
  }' | jq .
# Expected: 200, {"mapping":{"first_name":"John"}}

# Rate limit test (send 101 requests)
for i in $(seq 1 101); do curl -s "$BASE/health" > /dev/null; done
# The 101st request should return 429
```

### 15.2 Extension End-to-End Test

1. Start backend: `cd backend && npm run dev`
2. Build extension for development: `cd extension && VITE_API_URL=http://localhost:3001 npm run build`
3. Load in Chrome: chrome://extensions → Load unpacked → select `extension/dist/`
4. Open extension popup
5. Register a new account
6. Upload a test PDF resume
7. Open a job application form in a new tab (or use a test HTML form)
8. Click Autofill in the extension popup
9. Verify fields are filled

### 15.3 Security Verification Checklist

```
[ ] Inspect extension/dist/*.js — confirm no API keys present
[ ] Chrome DevTools Network tab — confirm requests go to localhost:3001 or api.applyonce.ai, NOT to googleapis.com/groq.com/cerebras.ai/openrouter.ai
[ ] Call /api/v1/ai/autofill without Authorization header — expect 401
[ ] Forge a JWT with wrong secret — expect 401
[ ] Send a 15 MB PDF to /api/v1/resume/upload — expect 413
[ ] Send 101 requests in 1 minute — expect 429 on request 101
[ ] Check response headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
[ ] Verify CORS rejects requests from http://evil.com
[ ] Verify no error stack traces in production 500 responses
```

---

## STEP 16: Rollback Plan

### 16.1 When to Roll Back

- Backend is down for more than 30 minutes during business hours
- Authentication system is broken (users locked out)
- AI router is failing for all providers simultaneously
- Critical security vulnerability discovered in deployed backend

### 16.2 Backend Rollback (Railway)

Railway keeps the last 10 deployments. Roll back instantly:

```bash
railway rollback  # Reverts to previous deployment in <30 seconds
```

Alternatively, from the Railway dashboard: Deployments → select previous deployment → Redeploy.

### 16.3 Extension Rollback

If a new extension version has issues:
1. Chrome Web Store Developer Dashboard → select the app → Store Listing → Versions
2. Unpublish the current version and re-publish a previous zip
3. Note: Chrome extensions auto-update, so propagation takes up to 24 hours

Always keep the last 3 packaged zip files archived as GitHub release artifacts.

### 16.4 Emergency Rollback to Old Architecture (Last Resort)

Only if backend is completely unavailable for >24 hours:

1. Generate fresh API keys from all 4 providers
2. Check out the last git commit before migration started
3. Create `extension/.env` with the fresh keys (NOT the revoked ones)
4. Build and package the old extension version
5. Upload to Chrome Web Store
6. This is a **security regression** — track it and resume migration as soon as possible

### 16.5 Acceptance Criteria for Step 16

- [ ] Railway rollback command tested and works
- [ ] Previous extension zip saved as GitHub release artifact
- [ ] Rollback procedure documented and shared with the team

---

## STEP 17: Final Security Audit

### 17.1 Automated Audit — Run All These Commands

All of these must return 0 results. If any return output, STOP and fix before continuing.

```bash
# 1. Search for live API key patterns in all source code
grep -r "AIza\|gsk_\|csk-\|sk-or-v1-" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git \
  .
# Expected: 0 results

# 2. Search for AI key variable names in extension source
grep -r "GEMINI_API_KEY\|GROQ_API_KEY\|CEREBRAS_API_KEY\|OPENROUTER_API_KEY" \
  extension/src/
# Expected: 0 results

# 3. Search for direct AI provider URLs in extension source
grep -r "generativelanguage.googleapis.com\|api.groq.com\|api.cerebras.ai\|openrouter.ai" \
  extension/src/
# Expected: 0 results

# 4. Verify import.meta.env in extension only references VITE_API_URL
grep -r "import\.meta\.env" extension/src/ | grep -v "VITE_API_URL"
# Expected: 0 results

# 5. Scan extension dist output
grep -r "AIza\|gsk_\|csk-\|sk-or-v1-" extension/dist/ 2>/dev/null
grep -r "GEMINI_API_KEY\|GROQ_API_KEY\|CEREBRAS_API_KEY\|OPENROUTER_API_KEY" extension/dist/ 2>/dev/null
grep -r "generativelanguage.googleapis.com\|api.groq.com\|api.cerebras.ai\|openrouter.ai" extension/dist/ 2>/dev/null
# Expected: 0 results for all

# 6. Verify backend .env is NOT tracked by git
git ls-files backend/.env
# Expected: empty output (file is not tracked)

# 7. Verify root .env does not contain AI keys
grep "GEMINI_API_KEY\|GROQ_API_KEY\|CEREBRAS_API_KEY\|OPENROUTER_API_KEY" .env 2>/dev/null || echo "PASS"

# 8. Verify no .env files with AI keys are tracked by git
git ls-files | grep "\.env$" | while read f; do
  if grep -q "GEMINI_API_KEY\|GROQ_API_KEY" "$f" 2>/dev/null; then
    echo "FAIL: $f contains AI keys and is tracked by git"
  fi
done
```

### 17.2 Final Security Confirmation Checklist

Verify every item before declaring the migration complete:

```
Security — Extension
[ ] extension/src/lib/ai/ directory does not exist
[ ] extension/src/ai/prompts.ts does not exist
[ ] extension/.env contains only VITE_API_URL (no AI keys)
[ ] extension/dist/ contains no AI provider API keys
[ ] extension/dist/ contains no direct AI provider URLs
[ ] extension/manifest.json host_permissions is restricted to api.applyonce.ai and localhost
[ ] chrome.storage.local only stores JWT tokens and UserProfile (no API keys)

Security — Backend
[ ] backend/src/config/env.ts is the only place process.env is read
[ ] backend/.env is not tracked by git
[ ] All AI keys exist only in backend/.env and in GitHub Secrets
[ ] JWT_SECRET and JWT_REFRESH_SECRET are different 64-character random values
[ ] No AI provider key is ever logged or returned in error responses

Security — Frontend
[ ] Frontend source contains zero AI provider references
[ ] Frontend .env contains only VITE_API_URL

API Security
[ ] All routes except /health and /api/v1/auth/* require valid JWT
[ ] Invalid JWT returns 401 with no sensitive information
[ ] Expired JWT returns 401 with code TOKEN_EXPIRED (triggers refresh)
[ ] Rate limiting is active globally and per route
[ ] Helmet security headers are present on all responses
[ ] CORS rejects unauthorized origins
[ ] File uploads are limited to 10 MB
[ ] Error responses sanitize internal details in production

User Experience — Unchanged
[ ] Users can download and install the extension
[ ] Users can register and log in via the extension
[ ] Users can upload their PDF resume
[ ] The backend parses the resume and returns a structured profile
[ ] Users can autofill job application forms
[ ] Autofill uses the same AI providers as before (via backend)
[ ] The experience is identical to before the migration
```

---

## Key Decisions Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| Backend framework | Fastify | Fastest, TypeScript-native, best plugin ecosystem for security features |
| Backend deployment | Railway | Simplest Node.js deployment, auto-HTTPS, built-in env management |
| Frontend deployment | Vercel | Already connected via Lovable — no change needed |
| Auth strategy | Stateless JWT + Refresh tokens | No database needed for MVP |
| PDF extraction | Client-side (pdfjs-dist) preferred | Smaller payloads to backend; raw PDF stays with user |
| Token storage | chrome.storage.local | Encrypted per Chrome profile; better than localStorage |
| Prompts location | Backend only | Prevents prompt injection discovery; protects prompt engineering |
| Fallback order | Gemini → Groq → Cerebras → OpenRouter | Same order as current extension |

---

## Critical Don'ts

1. **DO NOT** add any AI provider key to `extension/.env`, even for local testing
2. **DO NOT** commit `backend/.env` to git under any circumstances
3. **DO NOT** log any environment variable value in backend logs
4. **DO NOT** return AI provider error messages directly to clients (may reveal key information)
5. **DO NOT** use the same JWT_SECRET for both access and refresh tokens
6. **DO NOT** force-push or rebase committed history (Lovable requirement — it will break the Lovable sync)
7. **DO NOT** skip Step 17.1 automated audit — run it after every build
8. **DO NOT** put the extension zip file into git — distribute via Chrome Web Store only

---

*End of Agent Instructions — ApplyOnce AI Secure Architecture Migration v1.0*
