// ─────────────────────────────────────────────
//  ApplyOnce AI – Shared types and error classes
// ─────────────────────────────────────────────

export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIResponse {
  text: string;
  usage?: AIUsage;
  finishReason?: string;
  model: string;
  provider: string;
}

export interface RequestOptions {
  temperature?: number;
  timeoutMs?: number;
}

export interface AIProvider {
  readonly name: string;
  generateText(prompt: string, options?: RequestOptions): Promise<AIResponse>;
}

// Custom Error Classes
export class BaseAIError extends Error {
  constructor(message: string, public readonly provider?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends BaseAIError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

export class ProviderUnavailableError extends BaseAIError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

export class TimeoutError extends BaseAIError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

export class AuthenticationError extends BaseAIError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

export class ValidationError extends BaseAIError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}
