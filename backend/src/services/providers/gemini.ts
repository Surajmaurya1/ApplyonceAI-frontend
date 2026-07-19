// backend/src/services/providers/gemini.ts
import { env } from "../../config/env.js";
import {
  AIProvider, AIResponse, RequestOptions,
  ValidationError, AuthenticationError, RateLimitError,
  TimeoutError, ProviderUnavailableError,
} from "./types.js";

export class GeminiProvider implements AIProvider {
  readonly name = "Gemini";
  private readonly model = "gemini-1.5-flash";
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

  async generateText(prompt: string, options?: RequestOptions): Promise<AIResponse> {
    const apiKey = env.GOOGLE_API_KEY;
    if (!apiKey) throw new ValidationError("Gemini API key not configured.", this.name);

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        ...(options?.maxTokens && { maxOutputTokens: options.maxTokens }),
      },
    });

    const response = await this.fetchWithTimeout(
      url,
      { method: "POST", headers: { "Content-Type": "application/json" }, body },
      options?.timeoutMs ?? 30000
    );

    await this.assertOk(response);
    const data = await response.json() as any;

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new ValidationError("Empty response from Gemini.", this.name);

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: data.candidates?.[0]?.finishReason,
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err.name === "AbortError")
        throw new TimeoutError(`Gemini timed out after ${ms}ms`, this.name);
      throw new ProviderUnavailableError(`Network error: ${err.message}`, this.name);
    } finally {
      clearTimeout(id);
    }
  }

  private async assertOk(response: Response): Promise<void> {
    if (response.ok) return;
    const text = await response.text().catch(() => response.statusText);
    const msg = `Gemini API (${response.status}): ${text}`;
    if (response.status === 401 || response.status === 403)
      throw new AuthenticationError(msg, this.name);
    if (response.status === 429) throw new RateLimitError(msg, this.name);
    if (response.status >= 500) throw new ProviderUnavailableError(msg, this.name);
    throw new ValidationError(msg, this.name);
  }
}
