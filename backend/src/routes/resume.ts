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
