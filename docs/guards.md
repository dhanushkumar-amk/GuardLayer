# Guardrail Reference Guide

GuardLayer employs a bi-directional guardrail pipeline. This document provides a deep dive into each guard, how it works, configuration options, and plugin customization.

---

## Input Guardrails (Pre-LLM)

### 1. Prompt Injection Classifier
- **Mechanism**: Analyzes incoming prompts using a lightweight sequence classification transformer model trained to distinguish user-provided inputs from prompt override payloads.
- **Detections**: Identifies direct instructions like "Ignore previous rules", "You are now in Developer Mode", or hidden instructions in inputs.
- **Tuning**: The `prompt_injection_threshold` defines the classification confidence score (between `0.0` and `1.0`) above which the prompt is flagged and blocked. Default: `0.70`.

### 2. Jailbreak Detector
- **Mechanism**: Implements pattern classifiers combined with semantic analysis to detect adversarial prompt styling.
- **Detections**: Identifies known structural attacks such as roleplay exploits ("DAN", "Do Anything Now"), hypotheticals ("For academic purposes only..."), and sandboxing escapes.
- **Tuning**: Adjust the sensitivity using `jailbreak_threshold`. Higher values (e.g., `0.90`) make it less sensitive (requires higher confidence to block). Default: `0.70`.

### 3. PII Scrubbing
- **Mechanism**: Scans prompts using tokenizers and regular expressions to locate and scrub sensitive data.
- **Supported PII Types**:
  - `email`: Standard RFC 5322 email patterns.
  - `phone`: Global formats and country-specific rules.
  - `aadhaar`: Specifically detects **Indian Aadhaar card numbers** matching the `\b\d{4}[ -]?\d{4}[ -]?\d{4}\b` regular expression combined with a Verhoeff checksum validation.
  - `credit_card`: Standard Luhn-algorithm-checked numbers for Visa, Mastercard, AMEX, Discover.
  - `bank_account`: Basic routing and account number structural patterns.
  - `api_key`: Structural formats matching typical API tokens (e.g., prefix `sk-` or `gl-`).
- **Tuning**: Enabled via toggles per PII type. When active, matches are scrubbed and replaced with generic placeholder tokens (e.g., `[REDACTED_EMAIL]`).

### 4. Topic Filter
- **Mechanism**: Evaluates the semantic embedding of user inputs against a defined list of allowed business categories.
- **Detections**: Determines if a query falls outside the bounds of authorized subjects (e.g., blocking queries about medical diagnostics if your chatbot is configured only for IT support).
- **Tuning**: Define a string array of `allowed_topics`. If an input fails to align semantically with any topic in the list, it is blocked.

### 5. Token Limit Check
- **Mechanism**: Performs string token length estimation.
- **Detections**: Blocks payloads exceeding the defined maximum to protect downstream LLM APIs from size exploitation or excessive billing charges.

---

## Output Guardrails (Post-LLM)

### 1. Toxicity Scanner
- **Mechanism**: Analyzes generated LLM response completions using a multi-label classification model.
- **Detections**: Identifies profanity, hate speech, threats, harassment, and sexual content in responses.
- **Tuning**: Configured using `toxicity_threshold`. Scores above the threshold trigger blocking rules. Default: `0.80`.

### 2. Hallucination Detector
- **Mechanism**: Cross-references the generated model completion text against the original user input context or documents.
- **Detections**: Identifies unsupported claims, contradictions, or details not found in the baseline reference prompt.
- **Tuning**: Configured using `hallucination_enabled` and `block_on_hallucination` flags. If `block_on_hallucination` is false, inconsistencies are logged as alerts/threats but not blocked.

---

## How to Tune Thresholds

1. **Review Logs**: Use the **Security Auditing** panel on the GuardLayer Dashboard to inspect flagged requests.
2. **Observe Scores**: Note the exact classification scores of false positives and false negatives.
3. **Calibrate**: Adjust the slider in the **Configuration** dashboard page:
   - Decrease threshold to increase sensitivity (catch more threats, higher false positives).
   - Increase threshold to decrease sensitivity (reduce false positives, higher risk of bypass).

---

## Writing Custom Guard Plugins

You can write custom plugins to execute arbitrary security checks in the Python-based `input-guard` service:

1. Create a file `services/input-guard/src/guards/custom_my_guard.py`.
2. Implement the standard guard class inheriting from `BaseGuard`:
   ```python
   from .base import BaseGuard, GuardResult

   class CustomMyGuard(BaseGuard):
       def __init__(self, config):
           self.enabled = config.get("my_guard_enabled", False)
           self.keywords = ["secret_code", "classified_info"]

       async def inspect(self, prompt: str) -> GuardResult:
           if not self.enabled:
               return GuardResult(triggered=False)

           for word in self.keywords:
               if word in prompt.lower():
                   return GuardResult(
                       triggered=True,
                       score=1.0,
                       reason=f"Found restricted keyword: {word}"
                   )
           return GuardResult(triggered=False)
   ```
3. Register the guard class in `services/input-guard/src/main.py`.
