// backend/src/middleware/auth.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../services/jwtService.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
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
