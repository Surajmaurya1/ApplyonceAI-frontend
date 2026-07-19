// backend/src/services/providers/types.ts
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
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  generateText(prompt: string, options?: RequestOptions): Promise<AIResponse>;
}

// Error hierarchy — same as the extension's types.ts but now server-side
export class BaseAIError extends Error {
  constructor(message: string, public readonly provider?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
export class RateLimitError extends BaseAIError {}
export class ProviderUnavailableError extends BaseAIError {}
export class TimeoutError extends BaseAIError {}
export class AuthenticationError extends BaseAIError {}
export class ValidationError extends BaseAIError {}
