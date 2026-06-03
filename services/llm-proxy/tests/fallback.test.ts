import request from 'supertest';
import { app, server } from '../src/index';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

afterAll(() => {
  server.close();
});

describe('Fallback Provider Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return primary provider response and not try fallbacks if primary succeeds', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: 'Success from OpenAI!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      }
    });

    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'key-primary',
      fallbacks: [
        { provider: 'groq', model: 'llama-3', api_key: 'key-fallback-1' },
        { provider: 'gemini', model: 'gemini-1.5', api_key: 'key-fallback-2' }
      ]
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Success from OpenAI!');
    expect(res.body.provider_used).toBe('openai');
    expect(mockedAxios).toHaveBeenCalledTimes(1);
  });

  it('should fall back to fallback 1 if primary provider fails', async () => {
    // 1st call fails, 2nd call succeeds
    mockedAxios
      .mockRejectedValueOnce(new Error('OpenAI Rate Limited'))
      .mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'Response from Groq!' } }],
          usage: { prompt_tokens: 5, completion_tokens: 15, total_tokens: 20 }
        }
      });

    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'key-primary',
      fallbacks: [
        { provider: 'groq', model: 'llama-3', api_key: 'key-fallback-1' },
        { provider: 'gemini', model: 'gemini-1.5', api_key: 'key-fallback-2' }
      ]
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Response from Groq!');
    expect(res.body.provider_used).toBe('groq');
    expect(mockedAxios).toHaveBeenCalledTimes(2);

    // Verify correct api key was used for the successful call (2nd call)
    const secondCallArgs = mockedAxios.mock.calls[1][0] as any;
    expect(secondCallArgs.headers['Authorization']).toBe('Bearer key-fallback-1');
  });

  it('should fall back to fallback 2 if primary and fallback 1 both fail', async () => {
    mockedAxios
      .mockRejectedValueOnce(new Error('OpenAI Down'))
      .mockRejectedValueOnce(new Error('Groq Auth Failed'))
      .mockResolvedValueOnce({
        data: {
          candidates: [{ content: { parts: [{ text: 'Response from Gemini!' }] } }]
        }
      });

    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'key-primary',
      fallbacks: [
        { provider: 'groq', model: 'llama-3', api_key: 'key-fallback-1' },
        { provider: 'gemini', model: 'gemini-1.5', api_key: 'key-fallback-2' }
      ]
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Response from Gemini!');
    expect(res.body.provider_used).toBe('gemini');
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });

  it('should return error with all failure reasons if all providers fail', async () => {
    mockedAxios
      .mockRejectedValueOnce(new Error('OpenAI Error'))
      .mockRejectedValueOnce(new Error('Groq Error'))
      .mockRejectedValueOnce(new Error('Gemini Error'));

    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'key-primary',
      fallbacks: [
        { provider: 'groq', model: 'llama-3', api_key: 'key-fallback-1' },
        { provider: 'gemini', model: 'gemini-1.5', api_key: 'key-fallback-2' }
      ]
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('All LLM providers failed');
    expect(res.body.error).toContain('OpenAI Error');
    expect(res.body.error).toContain('Groq Error');
    expect(res.body.error).toContain('Gemini Error');
  });

  it('should fall back to next provider on timeout (30 seconds limit)', async () => {
    const timeoutError = new Error('timeout of 30000ms exceeded');
    (timeoutError as any).code = 'ECONNABORTED';

    mockedAxios
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'Fallback response after timeout!' } }]
        }
      });

    const payload = {
      message: 'Hello',
      provider: 'openai',
      model: 'gpt-4o',
      api_key: 'key-primary',
      fallbacks: [
        { provider: 'groq', model: 'llama-3', api_key: 'key-fallback-1' }
      ]
    };

    const res = await request(app)
      .post('/proxy/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Fallback response after timeout!');
    expect(res.body.provider_used).toBe('groq');
    
    // Verify first call set the timeout correctly
    const firstCallArgs = mockedAxios.mock.calls[0][0] as any;
    expect(firstCallArgs.timeout).toBe(30000);
  });
});
