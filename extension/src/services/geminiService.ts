// ─────────────────────────────────────────────
//  ApplyOnce AI – Multi-Provider AI Service
// ─────────────────────────────────────────────
import { RESUME_PARSE_PROMPT, AUTOFILL_MAPPING_PROMPT } from "@/ai/prompts";
import type { UserProfile, FormField, AutofillMapping } from "@/types";
import { ai } from "@/lib/ai";

const MAX_RETRIES = 3;

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
 * Attempts to parse JSON from response, stripping markdown if needed.
 */
function parseJSON<T>(raw: string): T {
  const clean = stripMarkdown(raw);
  return JSON.parse(clean) as T;
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
      const res = await ai.generateText(prompt);
      const raw = res.text;
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

      const res = await ai.generateText(prompt);
      const raw = res.text;
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
