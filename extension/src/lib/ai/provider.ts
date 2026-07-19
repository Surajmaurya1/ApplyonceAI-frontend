// ─────────────────────────────────────────────
//  ApplyOnce AI – Base Provider Class
// ─────────────────────────────────────────────

import {
  RateLimitError,
  ProviderUnavailableError,
  TimeoutError,
  AuthenticationError,
  ValidationError,
  BaseAIError,
} from "./types";

/**
 * Resolves environment variables, supporting both standard and VITE_ prefixed versions.
 */
export function getEnv(key: string): string {
  const viteKey = `VITE_${key}`;
  const val =
    (import.meta.env?.[viteKey] as string) ||
    (import.meta.env?.[key] as string) ||
    (typeof process !== "undefined" ? process.env?.[key] : undefined) ||
    (typeof process !== "undefined" ? process.env?.[viteKey] : undefined);
  return val || "";
}

export abstract class BaseProvider {
  abstract readonly name: string;

  /**
   * Helper to make an HTTP request with built-in timeout and custom error mapping.
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 20000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        throw new TimeoutError(`Request to ${this.name} timed out after ${timeoutMs}ms`, this.name);
      }
      throw new ProviderUnavailableError(
        `Network error calling ${this.name}: ${err.message || String(err)}`,
        this.name
      );
    }
  }

  /**
   * Translates HTTP responses into custom error types or returns JSON.
   */
  protected async handleHTTPResponse(response: Response): Promise<any> {
    if (response.ok) {
      try {
        return await response.json();
      } catch (err: any) {
        throw new ProviderUnavailableError(
          `Failed to parse response JSON from ${this.name}: ${err.message}`,
          this.name
        );
      }
    }

    const status = response.status;
    let errorText = "";
    try {
      errorText = await response.text();
    } catch {
      errorText = response.statusText;
    }

    const message = `${this.name} API error (${status}): ${errorText || response.statusText}`;

    if (status === 401 || status === 403) {
      throw new AuthenticationError(message, this.name);
    } else if (status === 429) {
      throw new RateLimitError(message, this.name);
    } else if (status === 400 || status === 422) {
      throw new ValidationError(message, this.name);
    } else if (status >= 500) {
      throw new ProviderUnavailableError(message, this.name);
    } else {
      throw new BaseAIError(message, this.name);
    }
  }
}
