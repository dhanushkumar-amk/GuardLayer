export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderConfig {
  provider: string;
  model: string;
  api_key: string;
  max_tokens?: number;
}

export interface ProxyChatRequest {
  message: string;
  conversation_history?: Message[];
  provider: string;
  model: string;
  api_key: string;
  max_tokens?: number;
  fallbacks?: ProviderConfig[];
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ProxyChatResponse {
  response: string;
  provider_used: string;
  model_used: string;
  latency_ms: number;
  tokens_used: TokenUsage;
}
