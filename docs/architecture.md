# System Architecture Guide

GuardLayer is designed as a modular, distributed system utilizing lightweight microservices. This guarantees scalability, fault-isolation, and robust routing.

---

## Service Component Breakdown

1. **API Gateway (`api-gateway`)**:
   - **Role**: Standard entry point for both proxy LLM requests (`/v1/*`) and admin dashboard APIs (`/api/*`).
   - **Responsibilities**: Enforces API key verification, checks rate limits, routes to safety guards, and forwards requests to target LLMs.
2. **Configuration Service (`config-service`)**:
   - **Role**: Configuration settings store.
   - **Responsibilities**: Manages active API keys, global default configurations, and custom overrides.
3. **Input Guard (`input-guard`)**:
   - **Role**: Safety layer applied to client prompts.
   - **Responsibilities**: Prompt injection classifier, jailbreak detection, PII scrubbing, and topic filters.
4. **Output Guard (`output-guard`)**:
   - **Role**: Safety layer applied to model responses.
   - **Responsibilities**: Toxicity checks, hallucination evaluation, and output PII scrubbing.
5. **LLM Proxy (`llm-proxy`)**:
   - **Role**: Interface abstraction to LLM providers.
   - **Responsibilities**: Standardizes requests to OpenAI, Anthropic, Gemini, or LiteLLM endpoints.
6. **Audit Service (`audit-service`)**:
   - **Role**: Transaction logger.
   - **Responsibilities**: Logs safety metrics, latency times, and exports logs as CSV files.

---

## Service Communication

- **Synchronous Commands (HTTP REST)**: Used for configuration edits, authentication, and the core synchronous LLM processing chain.
- **Asynchronous Events (Redis Pub/Sub)**: Used to log audit entries. When `api-gateway` finishes processing a proxy request, it asynchronously publishes a completion log to a Redis queue. The `audit-service` subscribes to this queue to process writes without blocking active user requests.

---

## Data Pipeline Flow

```
 Client App            API Gateway          Input Guard          Output Guard           LLM Proxy
    |                      |                     |                    |                     |
    |--- POST /chat ------>|                     |                    |                     |
    |    (Client API Key)  |--- Inspect Prompt ->|                    |                     |
    |                      |<-- Safe / Scrubbed -|                    |                     |
    |                      |                                          |                     |
    |                      |---------------------- POST completions / prompt -------------->|
    |                      |<--------------------- Raw LLM Response Completion -------------|
    |                      |                                          |                     |
    |                      |--- Validate Response ------------------->|                     |
    |                      |<-- Safe / Blocked -----------------------|                     |
    |                      |                                          |                     |
    |<-- HTTP 200/400 -----|                                          |                     |
    |    (Scrubbed Resp)   |--[Publish Audit Event (Redis)]                                 |
```

---

## Database Schemas

GuardLayer uses PostgreSQL to store critical relational settings.

### `api_keys` Table
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `key_hash` (TEXT, unique)
- `key_prefix` (TEXT)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `last_used_at` (TIMESTAMP)

### `audit_logs` Table
- `id` (UUID, Primary Key)
- `api_key_id` (UUID, Foreign Key)
- `request_id` (UUID, Indexed)
- `original_input` (TEXT)
- `scrubbed_input` (TEXT)
- `llm_response` (TEXT)
- `scrubbed_response` (TEXT)
- `input_guards_triggered` (JSONB)
- `output_guards_triggered` (JSONB)
- `was_blocked` (BOOLEAN)
- `block_reason` (TEXT)
- `latency_ms` (INTEGER)
- `llm_provider` (TEXT)
- `llm_model` (TEXT)
- `created_at` (TIMESTAMP)

---

## Redis Usage Overview

- **Rate Limiting**: Uses Redis counters to restrict requests on API keys inside sliding windows.
- **Async Queueing**: Decentralizes database write tasks to prevent database locking bottlenecks from slowing down LLM proxy latency.
- **Real-time Alerting**: Broadcasts threats to the dashboard in real-time via SSE streams.

---

## Technology Rationale

- **TypeScript / Express**: Used for the API Gateway and orchestration services due to its high I/O throughput performance, large package registry, and fast HTTP routing properties.
- **Python**: Chosen for the input and output guard layers to leverage core AI libraries (Hugging Face Transformers, PyTorch, NLTK) for semantic evaluations.
- **PostgreSQL**: Relational storage for keys and configurations provides structural integrity, transactions, and robust indexed queries.
- **Redis**: Low-latency memory store allows rapid checks for rate limiting and handles pub/sub events at sub-millisecond speeds.
