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
  fastify.post("/logout", { preHandler: requireAuth }, async (_request, reply) => {
    return reply.send({ message: "Logged out successfully." });
  });
}
