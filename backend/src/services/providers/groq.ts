// backend/src/services/providers/groq.ts
import { env } from "../../config/env.js";
import {
  AIProvider, AIResponse, RequestOptions,
  ValidationError, AuthenticationError, RateLimitError,
  TimeoutError, ProviderUnavailableError,
} from "./types.js";

export class GroqProvider implements AIProvider {
  readonly name = "Groq";
  private readonly model = "llama-3.3-70b-versatile";
  private readonly baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  async generateText(prompt: string, options?: RequestOptions): Promise<AIResponse> {
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) throw new ValidationError("Groq API key not configured.", this.name);

    const body = JSON.stringify({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature ?? 0.1,
      ...(options?.maxTokens && { max_tokens: options.maxTokens }),
    });

    const response = await this.fetchWithTimeout(
      this.baseUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body,
      },
      options?.timeoutMs ?? 30000
    );

    await this.assertOk(response);
    const data = await response.json() as any;

    const text = data.choices?.[0]?.message?.content;
    if (text === undefined || text === null) throw new ValidationError("Empty response from Groq.", this.name);

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      finishReason: data.choices?.[0]?.finish_reason,
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err.name === "AbortError")
        throw new TimeoutError(`Groq timed out after ${ms}ms`, this.name);
      throw new ProviderUnavailableError(`Network error: ${err.message}`, this.name);
    } finally {
      clearTimeout(id);
    }
  }

  private async assertOk(response: Response): Promise<void> {
    if (response.ok) return;
    const text = await response.text().catch(() => response.statusText);
    const msg = `Groq API (${response.status}): ${text}`;
    if (response.status === 401 || response.status === 403)
      throw new AuthenticationError(msg, this.name);
    if (response.status === 429) throw new RateLimitError(msg, this.name);
    if (response.status >= 500) throw new ProviderUnavailableError(msg, this.name);
    throw new ValidationError(msg, this.name);
  }
}
