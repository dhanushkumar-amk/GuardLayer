import { Response } from 'express';
import axios from 'axios';
import redis from '../db/redis';
import crypto from 'crypto';
import { ApiKeyRequest } from '../middleware/apikey.middleware';

const INPUT_GUARD_URL = process.env.INPUT_GUARD_URL || 'http://localhost:8001';
const OUTPUT_GUARD_URL = process.env.OUTPUT_GUARD_URL || 'http://localhost:8002';
const LLM_PROXY_URL = process.env.LLM_PROXY_URL || 'http://localhost:8003';

export const chatCompletions = async (req: ApiKeyRequest, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);

  const { messages, model: requestedModel } = req.body;
  const config = req.config;
  const apiKeyId = req.apiKeyId;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const lastUserMessage = messages[messages.length - 1].content || '';
  const startTime = Date.now();

  const originalInput = lastUserMessage;
  let scrubbedInput = lastUserMessage;
  let inputGuardsTriggered: any[] = [];
  let wasBlocked = false;
  let blockReason = null;
  let blockedBy = null;

  // 1. Call Input Guard
  try {
    const inputGuardRes = await axios.post(`${INPUT_GUARD_URL}/guard/input`, {
      message: lastUserMessage,
      config: {
        prompt_injection_enabled: config.prompt_injection_enabled,
        prompt_injection_threshold: parseFloat(config.prompt_injection_threshold),
        jailbreak_enabled: config.jailbreak_enabled,
        jailbreak_threshold: parseFloat(config.jailbreak_threshold),
        pii_scrubbing_enabled: config.pii_scrubbing_enabled,
        pii_types: config.pii_types || [],
        topic_filter_enabled: config.topic_filter_enabled,
        allowed_topics: config.allowed_topics || [],
        toxicity_enabled: config.toxicity_enabled,
        toxicity_threshold: parseFloat(config.toxicity_threshold),
        max_tokens: config.max_tokens,
      },
    });

    const igData = inputGuardRes.data;
    scrubbedInput = igData.scrubbed_message;
    inputGuardsTriggered = igData.guards_triggered || [];

    if (!igData.allowed) {
      wasBlocked = true;
      blockedBy = igData.blocked_by;
      blockReason = igData.block_reason;
    }
  } catch (err: any) {
    console.error('Input Guard call failed:', err.message);
  }

  // Handle Input Guard Block
  if (wasBlocked) {
    const latency_ms = Date.now() - startTime;
    
    // Publish audit log
    const auditEvent = {
      request_id: requestId,
      api_key_id: apiKeyId,
      original_input: originalInput,
      scrubbed_input: scrubbedInput,
      llm_response: '',
      scrubbed_response: '',
      input_guards_triggered: inputGuardsTriggered,
      output_guards_triggered: [],
      was_blocked: true,
      block_reason: blockReason,
      latency_ms,
      llm_provider: '',
      llm_model: requestedModel || '',
      created_at: new Date().toISOString(),
    };
    redis.publish('guardlayer:audit', JSON.stringify(auditEvent));

    // Publish threat log for blocked requests
    const threatEvent = {
      id: crypto.randomUUID(),
      request_id: requestId,
      api_key_id: apiKeyId,
      threat_type: blockedBy || 'unknown',
      threat_score: 1.0,
      original_input: originalInput,
      detected_at: new Date().toISOString(),
      guard_name: blockedBy || 'unknown_guard',
    };
    redis.publish('guardlayer:threats', JSON.stringify(threatEvent));

    return res.status(400).json({
      error: `Blocked by ${blockedBy}: ${blockReason}`,
      code: 'BLOCKED_BY_GUARD',
      blocked_by: blockedBy,
    });
  }

  // 2. Call LLM Proxy
  let llmResponse = '';
  let providerUsed = 'openai';
  let modelUsed = requestedModel || 'gpt-3.5-turbo';
  let tokensUsed = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  // Determine provider
  const modelParts = (requestedModel || '').split('/');
  if (modelParts.length > 1) {
    providerUsed = modelParts[0];
    modelUsed = modelParts.slice(1).join('/');
  } else if (modelUsed.startsWith('gemini')) {
    providerUsed = 'gemini';
  } else if (modelUsed.startsWith('claude')) {
    providerUsed = 'anthropic';
  }

  // Get matching api key from environment
  let providerApiKey = 'mock-key';
  const provUpper = providerUsed.toUpperCase();
  if (process.env[`${provUpper}_API_KEY`]) {
    providerApiKey = process.env[`${provUpper}_API_KEY`]!;
  }

  try {
    const messagesToSend = [...messages];
    messagesToSend[messagesToSend.length - 1] = {
      ...messagesToSend[messagesToSend.length - 1],
      content: scrubbedInput,
    };

    const proxyRes = await axios.post(`${LLM_PROXY_URL}/proxy/chat`, {
      message: scrubbedInput,
      conversation_history: messagesToSend.slice(0, -1),
      provider: providerUsed,
      model: modelUsed,
      api_key: providerApiKey,
      max_tokens: config.max_tokens,
    });

    llmResponse = proxyRes.data.response;
    providerUsed = proxyRes.data.provider_used;
    modelUsed = proxyRes.data.model_used;
    tokensUsed = proxyRes.data.tokens_used;
  } catch (err: any) {
    console.error('LLM Proxy call failed:', err.message);
    const latency_ms = Date.now() - startTime;
    
    // Log proxy failure
    const auditEvent = {
      request_id: requestId,
      api_key_id: apiKeyId,
      original_input: originalInput,
      scrubbed_input: scrubbedInput,
      llm_response: '',
      scrubbed_response: '',
      input_guards_triggered: inputGuardsTriggered,
      output_guards_triggered: [],
      was_blocked: true,
      block_reason: `LLM Proxy call failed: ${err.message}`,
      latency_ms,
      llm_provider: providerUsed,
      llm_model: modelUsed,
      created_at: new Date().toISOString(),
    };
    redis.publish('guardlayer:audit', JSON.stringify(auditEvent));

    return res.status(502).json({
      error: `LLM Proxy call failed: ${err.message}`,
      code: 'LLM_PROXY_ERROR',
    });
  }

  // 3. Call Output Guard
  let scrubbedResponse = llmResponse;
  let outputGuardsTriggered: any[] = [];
  let outputBlocked = false;
  let outputBlockReason = null;
  let outputBlockedBy = null;

  try {
    const outputGuardRes = await axios.post(`${OUTPUT_GUARD_URL}/guard/output`, {
      response: llmResponse,
      original_message: lastUserMessage,
      config: {
        pii_scrubbing_enabled: config.pii_scrubbing_enabled,
        pii_types: config.pii_types || [],
        toxicity_enabled: config.toxicity_enabled,
        toxicity_threshold: parseFloat(config.toxicity_threshold),
        hallucination_enabled: config.hallucination_enabled,
        block_on_hallucination: config.block_on_hallucination,
        format_validation_enabled: false,
      },
    });

    const ogData = outputGuardRes.data;
    scrubbedResponse = ogData.scrubbed_response;
    outputGuardsTriggered = ogData.guards_triggered || [];

    if (!ogData.allowed) {
      outputBlocked = true;
      outputBlockedBy = ogData.blocked_by;
      outputBlockReason = ogData.block_reason;
    }
  } catch (err: any) {
    console.error('Output Guard call failed:', err.message);
  }

  const latency_ms = Date.now() - startTime;

  // Handle Output Guard Block
  if (outputBlocked) {
    const auditEvent = {
      request_id: requestId,
      api_key_id: apiKeyId,
      original_input: originalInput,
      scrubbed_input: scrubbedInput,
      llm_response: llmResponse,
      scrubbed_response: scrubbedResponse,
      input_guards_triggered: inputGuardsTriggered,
      output_guards_triggered: outputGuardsTriggered,
      was_blocked: true,
      block_reason: outputBlockReason,
      latency_ms,
      llm_provider: providerUsed,
      llm_model: modelUsed,
      created_at: new Date().toISOString(),
    };
    redis.publish('guardlayer:audit', JSON.stringify(auditEvent));

    const threatEvent = {
      id: crypto.randomUUID(),
      request_id: requestId,
      api_key_id: apiKeyId,
      threat_type: outputBlockedBy || 'unknown',
      threat_score: 1.0,
      original_input: originalInput,
      detected_at: new Date().toISOString(),
      guard_name: outputBlockedBy || 'unknown_guard',
    };
    redis.publish('guardlayer:threats', JSON.stringify(threatEvent));

    return res.status(400).json({
      error: `Blocked by output guard ${outputBlockedBy}: ${outputBlockReason}`,
      code: 'BLOCKED_BY_GUARD',
      blocked_by: outputBlockedBy,
    });
  }

  // 4. Publish Successful Audit log
  const auditEvent = {
    request_id: requestId,
    api_key_id: apiKeyId,
    original_input: originalInput,
    scrubbed_input: scrubbedInput,
    llm_response: llmResponse,
    scrubbed_response: scrubbedResponse,
    input_guards_triggered: inputGuardsTriggered,
    output_guards_triggered: outputGuardsTriggered,
    was_blocked: false,
    block_reason: null,
    latency_ms,
    llm_provider: providerUsed,
    llm_model: modelUsed,
    created_at: new Date().toISOString(),
  };
  redis.publish('guardlayer:audit', JSON.stringify(auditEvent));

  // If input guard redacted anything (like PII) but didn't block, report threat
  const piiTriggered = inputGuardsTriggered.find((g) => g.guard === 'pii_scrubber');
  if (piiTriggered) {
    const threatEvent = {
      id: crypto.randomUUID(),
      request_id: requestId,
      api_key_id: apiKeyId,
      threat_type: 'pii',
      threat_score: piiTriggered.score,
      original_input: originalInput,
      detected_at: new Date().toISOString(),
      guard_name: 'pii_scrubber',
    };
    redis.publish('guardlayer:threats', JSON.stringify(threatEvent));
  }

  // Return OpenAI compatible response format
  return res.status(200).json({
    id: `chatcmpl-${requestId}`,
    object: 'chat.completion',
    created: Math.floor(startTime / 1000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: scrubbedResponse,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: tokensUsed.prompt_tokens,
      completion_tokens: tokensUsed.completion_tokens,
      total_tokens: tokensUsed.total_tokens,
    },
  });
};
