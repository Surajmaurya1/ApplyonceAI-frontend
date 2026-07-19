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
