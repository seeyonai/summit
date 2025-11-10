import OpenAI from 'openai';

export const model = process.env.SUMMIT_OPENAI_MODEL || process.env.OPENAI_MODEL;
if (!model) {
  throw new Error('Model must be specified.');
}
export const defaultClient = new OpenAI({
  apiKey: process.env.SUMMIT_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.SUMMIT_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL,
});

// Fast Model
export const fastModel = process.env.SUMMIT_FAST_OPENAI_MODEL || process.env.FAST_MODEL;
const fastApiKey = process.env.SUMMIT_FAST_OPENAI_API_KEY || process.env.FAST_API_KEY;
const fastBaseUrl = process.env.SUMMIT_FAST_OPENAI_BASE_URL || process.env.FAST_BASE_URL;
export const fastClient = new OpenAI({
  apiKey: fastApiKey,
  baseURL: fastBaseUrl,
});

/**
 * Unified helper to call chat.completions.create across different clients/models.
 *
 * Features:
 * - Accepts either an explicit client, or a target label ('default' | 'fast')
 * - Normalizes token field: use `maxTokens` in args and it will map to
 *   `max_completion_tokens` for GPT-5 style models, or `max_tokens` for others
 * - Leaves all other request fields intact, including streaming and tools
 */
export async function chatCompletions(request: any, clientOrTarget: 'default' | 'fast' = 'default'): Promise<any> {
  const selectedClient: OpenAI = clientOrTarget === 'fast' ? fastClient : defaultClient;

  // Load extra request parameters from environment (JSON), per target
  const parseJson = (val?: string | null) => {
    if (!val) return undefined;
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  };
  const extraFromEnv =
    clientOrTarget === 'default'
      ? parseJson(process.env.SUMMIT_OPENAI_MODEL_EXTRA_REQUEST)
      : clientOrTarget === 'fast'
      ? parseJson(process.env.SUMMIT_FAST_OPENAI_MODEL_EXTRA_REQUEST_EXTRA_REQUEST)
      : undefined;

  // Merge extras first so explicit request fields take precedence
  const merged: Record<string, unknown> = { ...(extraFromEnv || {}), ...(request as any) };
  console.log(`🚀 Merged: ${JSON.stringify(merged)}`);

  // Set default model if not provided
  if (!(merged as any).model) {
    const defaultModel = clientOrTarget === 'fast' ? fastModel : model;
    (merged as any).model = defaultModel;
  }

  // Normalize token key if caller provides a model and `maxTokens`
  const hasMaxTokens = Object.prototype.hasOwnProperty.call(merged, 'maxTokens');
  const normalized: Record<string, unknown> = { ...merged };
  if (hasMaxTokens) {
    const maxTokens = (merged as any).maxTokens;
    delete (normalized as any).maxTokens;
    if ((merged.model as string).startsWith('gpt-5') || model === 'o4-mini') {
      (normalized as any).max_completion_tokens = maxTokens;
      delete (normalized as any).max_tokens;
    } else {
      (normalized as any).max_tokens = maxTokens;
      delete (normalized as any).max_completion_tokens;
    }
  }

  // For GPT-5 and o4-mini, set temperature to 1 to conform to the new API spec
  if ((merged.model as string).startsWith('gpt-5') || model === 'o4-mini') {
    normalized.temperature = 1;
  }

  console.log(`🚀 Forwarding request to OpenAI model ${model}:`, normalized);
  // Forward the request as-is otherwise
  return selectedClient.chat.completions.create(normalized as any);
}
