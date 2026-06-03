import axios from 'axios';
import { ProxyChatResponse, Message, TokenUsage } from '../models/types';

export class LiteLLMService {
  /**
   * Forwards a chat request directly to the provider API using axios.
   */
  async callProvider(params: {
    message: string;
    conversation_history?: Message[];
    provider: string;
    model: string;
    api_key: string;
    max_tokens?: number;
  }): Promise<ProxyChatResponse> {
    const { message, conversation_history, provider, model, api_key, max_tokens } = params;
    const startTime = Date.now();

    const prov = provider.toLowerCase().trim();
    let url = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: any = {};
    let paramsObj: Record<string, string> = {};

    // Build the message history for OpenAI compatible format
    const messages = [];
    if (conversation_history && conversation_history.length > 0) {
      messages.push(...conversation_history);
    }
    messages.push({ role: 'user', content: message });

    if (prov === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers['Authorization'] = `Bearer ${api_key}`;
      body = {
        model,
        messages,
        max_tokens: max_tokens || 1000,
      };
    } else if (prov === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${api_key}`;
      body = {
        model,
        messages,
        max_tokens: max_tokens || 1000,
      };
    } else if (prov === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${api_key}`;
      headers['HTTP-Referer'] = 'guardlayer';
      body = {
        model,
        messages,
        max_tokens: max_tokens || 1000,
      };
    } else if (prov === 'gemini') {
      // Gemini models typically require prefix in Open/Google formats
      // Format URL: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      paramsObj['key'] = api_key;

      // Transform messages into Gemini format
      const contents = [];
      if (conversation_history && conversation_history.length > 0) {
        for (const msg of conversation_history) {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          contents.push({
            role: role,
            parts: [{ text: msg.content }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      body = {
        contents,
        generationConfig: {
          maxOutputTokens: max_tokens || 1000,
        },
      };
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      const response = await axios({
        method: 'post',
        url,
        headers,
        params: paramsObj,
        data: body,
        timeout: 30000, // 30 seconds max timeout
      });

      const latency_ms = Date.now() - startTime;
      const data = response.data;

      let responseText = '';
      let tokens_used: TokenUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      if (prov === 'gemini') {
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        tokens_used = {
          prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
          completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: data.usageMetadata?.totalTokenCount || 0,
        };
      } else {
        responseText = data.choices?.[0]?.message?.content || '';
        tokens_used = {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        };
      }

      return {
        response: responseText,
        provider_used: provider,
        model_used: model,
        latency_ms,
        tokens_used,
      };
    } catch (error: any) {
      // Clean sensitive API key from the error message if axios throws it in logs
      const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
      throw new Error(`[${provider}] API error: ${errorMsg}`);
    }
  }
}
