import { LiteLLMService } from './litellm.service';
import { ProxyChatRequest, ProxyChatResponse, ProviderConfig } from '../models/types';

export class FallbackService {
  private litellmService: LiteLLMService;

  constructor() {
    this.litellmService = new LiteLLMService();
  }

  /**
   * Attempts primary provider first, falling back to other providers sequentially on error.
   */
  async executeWithFallback(request: ProxyChatRequest): Promise<ProxyChatResponse> {
    const providersToTry: ProviderConfig[] = [
      {
        provider: request.provider,
        model: request.model,
        api_key: request.api_key,
        max_tokens: request.max_tokens,
      },
    ];

    if (request.fallbacks && request.fallbacks.length > 0) {
      providersToTry.push(...request.fallbacks);
    }

    const errors: string[] = [];

    for (const currentConfig of providersToTry) {
      try {
        const response = await this.litellmService.callProvider({
          message: request.message,
          conversation_history: request.conversation_history,
          provider: currentConfig.provider,
          model: currentConfig.model,
          api_key: currentConfig.api_key,
          max_tokens: currentConfig.max_tokens ?? request.max_tokens,
        });

        return response;
      } catch (err: any) {
        const errMsg = err.message || 'Unknown error';
        errors.push(`${currentConfig.provider}: ${errMsg}`);
      }
    }

    throw new Error(`All LLM providers failed. Failures: [${errors.join('; ')}]`);
  }
}
