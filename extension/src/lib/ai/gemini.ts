// ─────────────────────────────────────────────
//  ApplyOnce AI – Gemini Provider
// ─────────────────────────────────────────────

import { BaseProvider, getEnv } from "./provider";
import { AIProvider, AIResponse, RequestOptions, ValidationError } from "./types";

export class GeminiProvider extends BaseProvider implements AIProvider {
  readonly name = "Gemini";
  private readonly defaultModel = "gemini-1.5-flash";

  async generateText(prompt: string, options?: RequestOptions): Promise<AIResponse> {
    const apiKey = getEnv("GEMINI_API_KEY");
    if (!apiKey) {
      throw new ValidationError("Gemini API key is not configured.", this.name);
    }

    const model = this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
      },
    };

    const response = await this.fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      options?.timeoutMs
    );

    const data = await this.handleHTTPResponse(response);

    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (contentText === undefined || contentText === null) {
      throw new ValidationError("Invalid or empty response from Gemini API.", this.name);
    }

    const usage = data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : undefined;

    return {
      text: contentText,
      usage,
      finishReason: data.candidates?.[0]?.finishReason,
      model,
      provider: this.name,
    };
  }
}
