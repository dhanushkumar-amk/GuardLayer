# Configuration Guide

GuardLayer uses YAML configuration profiles to configure safety parameters. This document defines the configuration properties, values, and override behaviors.

---

## Configuration Properties Schema

Below is a reference guide mapping every key in `guardlayer.yaml`.

| Property | Type | Default | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prompt_injection_enabled` | `boolean` | `true` | Yes | Toggles prompt injection classification check. |
| `prompt_injection_threshold`| `float` | `0.70` | Yes | Sensitivity classifier score limit (`0.0` - `1.0`). |
| `jailbreak_enabled` | `boolean` | `true` | Yes | Toggles detection of sandbox escape formats. |
| `jailbreak_threshold` | `float` | `0.70` | Yes | Sensitivity classifier score limit (`0.0` - `1.0`). |
| `pii_scrubbing_enabled` | `boolean` | `true` | Yes | Enables scanner masking of PII keys. |
| `pii_types` | `array` | `[]` | No | List of types to mask: `email`, `phone`, `aadhaar`, `credit_card`, `bank_account`, `api_key`. |
| `topic_filter_enabled` | `boolean` | `false` | Yes | Toggles allowed business subject checks. |
| `allowed_topics` | `array` | `[]` | No | String categories allowed (e.g. `support`, `billing`). |
| `toxicity_enabled` | `boolean` | `true` | Yes | Toggles toxicity analysis in model completions. |
| `toxicity_threshold` | `float` | `0.80` | Yes | Toxicity score limit (`0.0` - `1.0`). |
| `max_tokens` | `integer` | `2000` | Yes | Caps max allowed response length (0 for unlimited). |
| `hallucination_enabled` | `boolean` | `false` | Yes | Enables factual consistency check post-generation. |
| `block_on_hallucination` | `boolean` | `false` | Yes | If `true`, halts response on mismatch. If `false`, logs threat but allows response. |

---

## Global Config vs API Key Config

Configuring GuardLayer is hierarchical:

1. **Global Default Configuration (`apiKeyId = 'default'`)**:
   Stored in the database and loaded when no API-key-specific rule matches. Configured on the admin panel by default.
2. **API Key Scopes Override**:
   Each created API key ID can hold its own distinct configuration profile. For example, your *developer sandbox* key could allow higher thresholds and disable PII masking for debugging, while your *production client* key enforces strict scrubbing and lower limits.

If an API key has no custom rules configured, the gateway dynamically falls back to importing configurations defined in the global template.

---

## Complete Example (`guardlayer.yaml`)

```yaml
# GuardLayer Gateway Configuration

# Input Guardrails (Pre-routing checks)
prompt_injection_enabled: true
prompt_injection_threshold: 0.75  # Moderate sensitivity

jailbreak_enabled: true
jailbreak_threshold: 0.80      # High threshold (strict check)

pii_scrubbing_enabled: true
pii_types:
  - email
  - phone
  - aadhaar                    # Indian identification number scanner active
  - credit_card

topic_filter_enabled: true
allowed_topics:
  - support
  - billing
  - accounts

max_tokens: 1500               # Enforces prompt budget control

# Output Guardrails (Post-completions checks)
toxicity_enabled: true
toxicity_threshold: 0.85

hallucination_enabled: true
block_on_hallucination: false  # Log alerts but do not block user response
```
