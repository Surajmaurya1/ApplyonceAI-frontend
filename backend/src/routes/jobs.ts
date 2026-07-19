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
