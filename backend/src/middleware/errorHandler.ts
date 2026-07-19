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
