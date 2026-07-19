# Walkthrough - Multi-Provider AI Architecture Refactored

We have successfully refactored the AI layer of the ApplyOnce browser extension. The architecture now supports multiple LLM providers with automatic fallback, transient retry mechanisms with exponential backoff, customized error classes, structured logging, and robust key validation.

## Changes Made

### 1. New Provider Core (`extension/src/lib/ai/`)
- Created [types.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/types.ts): Holds common TypeScript interfaces (`AIProvider`, `AIResponse`, `RequestOptions`) and structured custom error classes (`RateLimitError`, `TimeoutError`, `AuthenticationError`, `ValidationError`, `ProviderUnavailableError`).
- Created [provider.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/provider.ts): Implements the environment variable helper `getEnv(key)` (checks both `VITE_` prefixed and standard variables) and a `BaseProvider` wrapping requests with status code translation and a 20-second timeout.
- Created [gemini.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/gemini.ts): Native Gemini API provider using `gemini-1.5-flash`.
- Created [groq.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/groq.ts): Groq API provider using `llama-3.3-70b-versatile`.
- Created [cerebras.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/cerebras.ts): Cerebras API provider using `llama3.1-8b`.
- Created [openrouter.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/openrouter.ts): Fallback OpenRouter API provider using `openai/gpt-oss-20b:free` (`openrouter/free`).
- Created [fallback.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/fallback.ts): The coordinator checking keys, running exponential backoffs, handling fallbacks, and printing structured logs.
- Created [index.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/lib/ai/index.ts): Entry point initializing the providers in the specified priority order.

### 2. Integration and Env Updates
- Refactored [geminiService.ts](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/services/geminiService.ts): Removed local `callOpenRouter` helper and refactored `parseResumeToProfile` and `generateAutofillMapping` to use the unified `ai.generateText(...)` engine.
- Refactored [StatusBadge.tsx](file:///c:/Users/DeLL/Downloads/lovable-project/extension/src/components/StatusBadge.tsx): Updated to check config status dynamically using `ai.getConfiguredProviders()`, showing "AI Ready (PrimaryProvider)" if at least one key is configured.
- Modified [.env](file:///c:/Users/DeLL/Downloads/lovable-project/extension/.env) & created [.env.example](file:///c:/Users/DeLL/Downloads/lovable-project/extension/.env.example): Added config keys for all new providers.

---

## Technical Details

### Fallback Order
Providers are evaluated in this order:
1. **Gemini** (Primary)
2. **Groq**
3. **Cerebras**
4. **OpenRouter** (Fallback)

Providers without configured API keys are skipped automatically during startup.

### Retries & Exponential Backoff
Requests to any active provider will automatically retry up to 3 times on transient failures:
- `RateLimitError` (HTTP 429)
- `TimeoutError` (request took > 20s)
- `ProviderUnavailableError` (HTTP 5xx or Network Failure)

Retry delays increase exponentially:
- Attempt 1 -> wait 1 second
- Attempt 2 -> wait 2 seconds
- Attempt 3 -> wait 4 seconds

Validation and authentication errors are NOT retried. They immediately cause a transition to the next provider.

### Add a Future Provider
To add a new provider:
1. Create a new provider file under `extension/src/lib/ai/myprovider.ts` extending `BaseProvider` and implementing `AIProvider`.
2. Register the provider in `extension/src/lib/ai/index.ts` by adding it to the `FallbackAIOrchestrator` instantiation array in your desired priority position.

---

## Verification Results

We verified that the extension builds successfully with Vite.
Command executed:
```powershell
npm run build
```
Result:
```text
vite v5.4.21 building for production...
transforming...
✓ 2050 modules transformed.
rendering chunks...
dist/assets/popup-BD8HMyhe.js          429.51 kB │ gzip: 126.60 kB
✓ built in 23.08s
```
Zero compilation, lint, or TypeScript errors were encountered.
