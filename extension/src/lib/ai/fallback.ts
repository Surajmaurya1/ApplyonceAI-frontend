// ─────────────────────────────────────────────
//  ApplyOnce AI – Fallback Orchestrator
// ─────────────────────────────────────────────

import { getEnv } from "./provider";
import {
  AIProvider,
  AIResponse,
  RequestOptions,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  TimeoutError,
  ProviderUnavailableError,
  BaseAIError,
} from "./types";

export class FallbackAIOrchestrator implements AIProvider {
  readonly name = "FallbackAIOrchestrator";
  private providers: AIProvider[];

  constructor(providers: AIProvider[]) {
    this.providers = providers;
  }

  /**
   * Checks if a provider has its API key configured.
   */
  private isProviderConfigured(provider: AIProvider): boolean {
    const keyName = `${provider.name.toUpperCase()}_API_KEY`;
    const key = getEnv(keyName);
    return !!key && key !== `YOUR_${keyName}_HERE`;
  }

  /**
   * Gets the list of configured providers in order of priority.
   */
  getConfiguredProviders(): AIProvider[] {
    return this.providers.filter((p) => this.isProviderConfigured(p));
  }

  /**
   * Executes the text generation with retry logic and fallback.
   */
  async generateText(prompt: string, options?: RequestOptions): Promise<AIResponse> {
    const activeProviders = this.getConfiguredProviders();

    if (activeProviders.length === 0) {
      throw new ValidationError(
        "No AI providers are configured. Please set at least one API key (GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, or OPENROUTER_API_KEY) in your environment."
      );
    }

    let lastError: Error | null = null;

    for (let i = 0; i < activeProviders.length; i++) {
      const provider = activeProviders[i];
      const isLast = i === activeProviders.length - 1;

      console.log(`[ApplyOnce AI] Using ${provider.name}...`);

      try {
        const response = await this.executeWithRetry(provider, prompt, options);
        console.log(`[ApplyOnce AI] ${provider.name} succeeded.`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[ApplyOnce AI] ${provider.name} failed: ${errorMsg}`);

        if (!isLast) {
          const nextProvider = activeProviders[i + 1];
          console.log(`[ApplyOnce AI] Switching to ${nextProvider.name}...`);
        }
      }
    }

    // If we exhausted all providers, throw the last error
    throw (
      lastError ||
      new ProviderUnavailableError("All configured AI providers failed to respond.")
    );
  }

  /**
   * Runs request for a provider with exponential backoff retries.
   */
  private async executeWithRetry(
    provider: AIProvider,
    prompt: string,
    options?: RequestOptions
  ): Promise<AIResponse> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await provider.generateText(prompt, options);
      } catch (err: any) {
        const isTransient = this.isTransientError(err);

        // If it's a non-transient error (like ValidationError or AuthenticationError), do not retry.
        // Bubble it up immediately so we fallback to the next provider or fail.
        if (!isTransient || attempt === maxRetries) {
          throw err;
        }

        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.warn(
          `[ApplyOnce AI] ${provider.name} transient failure (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delayMs / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new ProviderUnavailableError(
      `Failed after ${maxRetries} retry attempts on ${provider.name}.`
    );
  }

  /**
   * Determines if an error is transient (should be retried).
   */
  private isTransientError(error: any): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof TimeoutError) return true;
    if (error instanceof ProviderUnavailableError) return true;

    // Treat generic network errors/fetch failures as transient
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.message?.includes("fetch"))
    ) {
      return true;
    }

    return false;
  }
}
