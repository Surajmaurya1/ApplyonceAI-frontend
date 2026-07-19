// ─────────────────────────────────────────────
//  ApplyOnce AI – AI Service Entry Point
// ─────────────────────────────────────────────

import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
import { CerebrasProvider } from "./cerebras";
import { OpenRouterProvider } from "./openrouter";
import { FallbackAIOrchestrator } from "./fallback";

export * from "./types";
export { getEnv } from "./provider";

// Instantiate providers in priority order:
// 1. Gemini (Primary)
// 2. Groq
// 3. Cerebras
// 4. OpenRouter (Last fallback)
const gemini = new GeminiProvider();
const groq = new GroqProvider();
const cerebras = new CerebrasProvider();
const openrouter = new OpenRouterProvider();

export const ai = new FallbackAIOrchestrator([gemini, groq, cerebras, openrouter]);
