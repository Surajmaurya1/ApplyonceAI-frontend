// ─────────────────────────────────────────────
//  ApplyOnce AI – OpenRouter AI Service
//  Replaces Gemini with OpenRouter API using
//  openai/gpt-oss-20b:free model.
// ─────────────────────────────────────────────
import { RESUME_PARSE_PROMPT, AUTOFILL_MAPPING_PROMPT } from "@/ai/prompts";
import type { UserProfile, FormField, AutofillMapping } from "@/types";

const MAX_RETRIES = 3;
const MODEL_NAME = "openai/gpt-oss-20b:free";

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "YOUR_OPENROUTER_API_KEY_HERE") {
    throw new Error(
      "OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in extension/.env"
    );
  }
  return apiKey;
}

/**
 * Strips markdown code fences from a string to extract raw JSON.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/**
 * Attempts to parse JSON from OpenRouter response, stripping markdown if needed.
 */
function parseJSON<T>(raw: string): T {
  const clean = stripMarkdown(raw);
  return JSON.parse(clean) as T;
}

/**
 * Calls OpenRouter API with a prompt and returns the text response.
 */
async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://applyonce.ai", // Optional, for OpenRouter rankings
      "X-Title": "ApplyOnce AI Extension", // Optional, for OpenRouter rankings
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenRouter API.");
  }

  return content;
}

/**
 * Parses resume text into a structured UserProfile.
 * Retries up to MAX_RETRIES times on invalid JSON.
 */
export async function parseResumeToProfile(
  resumeText: string
): Promise<UserProfile> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = RESUME_PARSE_PROMPT(resumeText);
      const raw = await callOpenRouter(prompt);
      const profile = parseJSON<UserProfile>(raw);

      // Embed the original resume text for context
      profile.resumeText = resumeText;

      // Basic validation
      if (!profile.personalInfo) {
        throw new Error("Profile missing personalInfo");
      }

      return profile;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[ApplyOnce] Resume parse attempt ${attempt} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        // Small delay before retry
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }

  throw new Error(
    `Failed to parse resume after ${MAX_RETRIES} attempts. ${lastError?.message ?? ""}`
  );
}

/**
 * Generates an autofill mapping from a profile and detected form fields.
 * Returns a Record<fieldId/name, value>.
 * Retries up to MAX_RETRIES times on invalid JSON.
 */
export async function generateAutofillMapping(
  profile: UserProfile,
  fields: FormField[]
): Promise<AutofillMapping> {
  if (fields.length === 0) {
    return {};
  }

  // Only send minimal field info to save tokens
  const fieldSummary = fields.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    label: f.label,
    placeholder: f.placeholder,
    ariaLabel: f.ariaLabel,
    options: f.options,
  }));

  // Strip resumeText to reduce token usage
  const profileForAI = { ...profile, resumeText: undefined };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = AUTOFILL_MAPPING_PROMPT(
        JSON.stringify(profileForAI, null, 2),
        JSON.stringify(fieldSummary, null, 2)
      );

      const raw = await callOpenRouter(prompt);
      const mapping = parseJSON<AutofillMapping>(raw);

      if (typeof mapping !== "object" || mapping === null) {
        throw new Error("Mapping is not a valid object");
      }

      return mapping;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[ApplyOnce] Autofill mapping attempt ${attempt} failed:`,
        lastError.message
      );

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }

  throw new Error(
    `Unable to generate mapping. Please try again. ${lastError?.message ?? ""}`
  );
}
