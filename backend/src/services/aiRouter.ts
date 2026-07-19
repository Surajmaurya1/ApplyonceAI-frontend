// backend/src/services/aiRouter.ts
// The AI fallback orchestrator — runs entirely on the server.
// API keys are never sent to the client.
import { GeminiProvider } from "./providers/gemini.js";
import { GroqProvider } from "./providers/groq.js";
import { CerebrasProvider } from "./providers/cerebras.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import {
  AIProvider, AIResponse, RequestOptions,
  RateLimitError, TimeoutError, ProviderUnavailableError,
} from "./providers/types.js";
import { env } from "../config/env.js";

// Build provider list based on which keys are configured.
// Order determines priority: Gemini → Groq → Cerebras → OpenRouter
function buildProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (env.GOOGLE_API_KEY) providers.push(new GeminiProvider());
  if (env.GROQ_API_KEY) providers.push(new GroqProvider());
  if (env.CEREBRAS_API_KEY) providers.push(new CerebrasProvider());
  if (env.OPENROUTER_API_KEY) providers.push(new OpenRouterProvider());
  return providers;
}

// Instantiated once at startup. Adding new providers requires server restart.
const providers = buildProviders();

/**
 * Generates text using the first available AI provider.
 * Falls through to the next provider if one fails.
 * Retries transient errors (rate limits, timeouts) before falling through.
 */
export async function generateText(
  prompt: string,
  options?: RequestOptions
): Promise<AIResponse> {
  if (providers.length === 0) {
    throw new Error("No AI providers configured on the server.");
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      return await executeWithRetry(provider, prompt, options);
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[AI Router] ${provider.name} failed: ${err.message}. Trying next provider...`
      );
    }
  }

  throw new ProviderUnavailableError(
    `All AI providers failed. Last error: ${lastError?.message ?? "Unknown"}`
  );
}

async function executeWithRetry(
  provider: AIProvider,
  prompt: string,
  options?: RequestOptions,
  maxRetries = 2
): Promise<AIResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await provider.generateText(prompt, options);
    } catch (err: any) {
      const isTransient =
        err instanceof RateLimitError ||
        err instanceof TimeoutError ||
        err instanceof ProviderUnavailableError;

      // Non-transient errors (auth, validation) bubble up immediately
      if (!isTransient || attempt === maxRetries) throw err;

      const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
      console.warn(
        `[AI Router] ${provider.name} attempt ${attempt} failed (transient). ` +
        `Retrying in ${delayMs}ms...`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new ProviderUnavailableError(`${provider.name} failed after ${maxRetries} retries.`);
}

export { AIResponse, RequestOptions };
