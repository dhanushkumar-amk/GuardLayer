import request from 'supertest';
import { app, server } from '../src/index';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

afterAll(() => {
  server.close();
});

describe('Proxy Chat Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle a valid groq request and return a normalized response', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: 'Hello from Groq!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      }
    });

    const payload = {
      message: 'Say hello',
      provider: 'groq',
      model: 'llama3-8b-8192',
      api_key: 'gsk_mock_key',
      max_tokens: 100
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Hello from Groq!');
    expect(res.body.provider_used).toBe('groq');
    expect(res.body.model_used).toBe('llama3-8b-8192');
    expect(res.body.latency_ms).toBeGreaterThanOrEqual(0);
    expect(res.body.tokens_used).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    });

    // Check axios headers and url
    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(callArgs.headers['Authorization']).toBe('Bearer gsk_mock_key');
  });

  it('should handle a valid openai request and return a normalized response', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: 'Hello from OpenAI!' } }],
        usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 }
      }
    });

    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'sk-mock-key'
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Hello from OpenAI!');
    expect(res.body.provider_used).toBe('openai');
    expect(res.body.tokens_used.total_tokens).toBe(40);
  });

  it('should handle a valid openrouter request and return a normalized response', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: 'Hello from OpenRouter!' } }],
        usage: { prompt_tokens: 12, completion_tokens: 18, total_tokens: 30 }
      }
    });

    const payload = {
      message: 'Hello OpenRouter',
      provider: 'openrouter',
      model: 'meta-llama/llama-3-8b-instruct',
      api_key: 'or-mock-key'
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Hello from OpenRouter!');
    expect(res.body.provider_used).toBe('openrouter');
    
    // Check referer header
    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.headers['HTTP-Referer']).toBe('guardlayer');
  });

  it('should convert gemini requests and normalize gemini responses correctly', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        candidates: [{ content: { parts: [{ text: 'Hello from Gemini!' }] } }],
        usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 12, totalTokenCount: 20 }
      }
    });

    const payload = {
      message: 'Hello Gemini',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      api_key: 'gemini-mock-key',
      conversation_history: [
        { role: 'user', content: 'Prehistory user message' },
        { role: 'assistant', content: 'Prehistory assistant message' }
      ]
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Hello from Gemini!');
    expect(res.body.provider_used).toBe('gemini');
    expect(res.body.tokens_used).toEqual({
      prompt_tokens: 8,
      completion_tokens: 12,
      total_tokens: 20
    });

    const callArgs = mockedAxios.mock.calls[0][0] as any;
    expect(callArgs.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
    expect(callArgs.params.key).toBe('gemini-mock-key');
    
    // Check that messages were correctly transformed to gemini structure
    const contents = callArgs.data.contents;
    expect(contents).toHaveLength(3);
    expect(contents[0]).toEqual({ role: 'user', parts: [{ text: 'Prehistory user message' }] });
    expect(contents[1]).toEqual({ role: 'model', parts: [{ text: 'Prehistory assistant message' }] });
    expect(contents[2]).toEqual({ role: 'user', parts: [{ text: 'Hello Gemini' }] });
  });

  it('should return 400 when api_key is missing', async () => {
    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o'
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('api_key');
  });

  it('should return 400 when message is missing', async () => {
    const payload = {
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'sk-mock-key'
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('message');
  });

  it('should handle provider errors gracefully and return 502', async () => {
    const axiosError = new Error('Request failed with status code 401');
    (axiosError as any).response = {
      data: {
        error: {
          message: 'Incorrect API key provided'
        }
      }
    };
    mockedAxios.mockRejectedValueOnce(axiosError);

    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'sk-invalid-key'
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('Incorrect API key provided');
  });
});
