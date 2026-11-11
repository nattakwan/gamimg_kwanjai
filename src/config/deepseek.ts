/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeepSeek API Configuration & Client Module
 * Provides OpenAI-compatible client configuration and helper functions
 * for deepseek-chat and deepseek-reasoner models.
 */

export interface DeepSeekConfig {
  provider: 'DeepSeek' | 'OpenAI-compatible';
  baseURL: string;
  defaultModel: string;
  reasoningModel: string;
  flashModel: string;
  proModel: string;
  apiKey: string;
}

// Read API key from Node process.env (server/build) or Vite import.meta.env (browser)
const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_KEY;
  }
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      return metaEnv.VITE_DEEPSEEK_API_KEY || metaEnv.DEEPSEEK_API_KEY || '';
    }
  } catch {
    // Ignore environments where import.meta.env is not available
  }
  return '';
};

export const DEEPSEEK_CONFIG: DeepSeekConfig = {
  provider: 'DeepSeek',
  baseURL: 'https://api.deepseek.com',
  defaultModel: 'deepseek-flash',
  reasoningModel: 'deepseek-v4-pro',
  flashModel: 'deepseek-flash',
  proModel: 'deepseek-v4-pro',
  apiKey: getApiKey(),
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekRequestOptions {
  model?: 'deepseek-flash' | 'deepseek-v4-pro' | 'deepseek-chat' | 'deepseek-reasoner' | string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
      reasoning_content?: string; // DeepSeek Reasoner specific field
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call DeepSeek Chat Completion API (OpenAI-compatible)
 */
export async function callDeepSeekChat(
  options: DeepSeekRequestOptions,
  customApiKey?: string
): Promise<DeepSeekResponse> {
  const apiKey = customApiKey || DEEPSEEK_CONFIG.apiKey || getApiKey();

  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    throw new Error(
      'DEEPSEEK_API_KEY is not configured. Please set the DEEPSEEK_API_KEY environment variable.'
    );
  }

  const endpoint = `${DEEPSEEK_CONFIG.baseURL}/v1/chat/completions`;

  const payload: Record<string, any> = {
    model: options.model || DEEPSEEK_CONFIG.defaultModel,
    messages: options.messages,
  };

  // deepseek-reasoner does not support temperature in some configurations, default to chat settings
  if (options.model !== DEEPSEEK_CONFIG.reasoningModel && options.temperature !== undefined) {
    payload.temperature = options.temperature;
  }

  if (options.max_tokens) {
    payload.max_tokens = options.max_tokens;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

