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
