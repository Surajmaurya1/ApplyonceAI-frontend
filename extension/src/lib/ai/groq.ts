// ─────────────────────────────────────────────
//  ApplyOnce AI – Groq Provider
// ─────────────────────────────────────────────

import { BaseProvider, getEnv } from "./provider";
import { AIProvider, AIResponse, RequestOptions, ValidationError } from "./types";

export class GroqProvider extends BaseProvider implements AIProvider {
  readonly name = "Groq";
  private readonly defaultModel = "llama-3.3-70b-versatile";

  async generateText(prompt: string, options?: RequestOptions): Promise<AIResponse> {
    const apiKey = getEnv("GROQ_API_KEY");
    if (!apiKey) {
      throw new ValidationError("Groq API key is not configured.", this.name);
    }

    const model = this.defaultModel;
    const url = "https://api.groq.com/openai/v1/chat/completions";

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
        },
        body: JSON.stringify(requestBody),
      },
      options?.timeoutMs
    );

    const data = await this.handleHTTPResponse(response);

    const contentText = data.choices?.[0]?.message?.content;
    if (contentText === undefined || contentText === null) {
      throw new ValidationError("Invalid or empty response from Groq API.", this.name);
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
