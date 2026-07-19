// ─────────────────────────────────────────────
//  ApplyOnce AI – OpenRouter Provider
// ─────────────────────────────────────────────

import { BaseProvider, getEnv } from "./provider";
import { AIProvider, AIResponse, RequestOptions, ValidationError } from "./types";

export class OpenRouterProvider extends BaseProvider implements AIProvider {
  readonly name = "OpenRouter";
  private readonly defaultModel = "openrouter/free";

  async generateText(prompt: string, options?: RequestOptions): Promise<AIResponse> {
    const apiKey = getEnv("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new ValidationError("OpenRouter API key is not configured.", this.name);
    }

    const model = this.defaultModel;
    const url = "https://openrouter.ai/api/v1/chat/completions";

    const requestBody = {
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: options?.temperature ?? 0.1,
    };

    const response = await this.fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://applyonce.ai",
          "X-Title": "ApplyOnce AI Extension",
        },
        body: JSON.stringify(requestBody),
      },
      options?.timeoutMs
    );

    const data = await this.handleHTTPResponse(response);

    const contentText = data.choices?.[0]?.message?.content;
    if (contentText === undefined || contentText === null) {
      throw new ValidationError("Invalid or empty response from OpenRouter API.", this.name);
    }

    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined;

    return {
      text: contentText,
      usage,
      finishReason: data.choices?.[0]?.finish_reason,
      model,
      provider: this.name,
    };
  }
}
