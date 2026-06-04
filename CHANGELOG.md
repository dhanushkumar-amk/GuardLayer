# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-04

### Added
- **Microservices Architecture**: Implemented core security gateway pipeline containing API Gateway, Config Service, Input Guard, Output Guard, LLM Proxy, and Audit Service.
- **Input Guardrails**:
  - Prompt Injection Classifier (sensitivity threshold tuning).
  - Jailbreak Detector (pattern and classification shield).
  - PII Scrubbing (masking of emails, phone numbers, Aadhaar cards, credit cards, bank accounts, and API keys).
  - Topic Filtering (allowed lists restricted to business scope).
  - Token Limit checking.
- **Output Guardrails**:
  - Toxicity Scanner (sensitivity threshold tuning).
  - Hallucination Detector (checking factual consistency against context inputs).
  - Output PII Scrubbing.
- **Audit Logging & Analytics**:
  - Structured storage of request prompts, scrubbed payloads, latency metrics, and guardrail outputs.
  - Interactive security diagnostics dashboards.
  - SSE-powered live threat streaming.
  - CSV export streaming using database-level cursors.
- **API Keys Manager**:
  - Keys creation, revocation, prefix validation, and rate limiting integration.
  - Dedicated configuration overrides per API key.
