import time
import os
from fastapi import APIRouter
from typing import List, Dict, Any, Tuple
from models.schemas import GuardInputRequest, GuardInputResponse, GuardTriggeredDetail

from guards.prompt_injection import scan_prompt_injection
from guards.jailbreak import scan_jailbreak
from guards.pii_scrubber import scan_and_scrub_pii
from guards.topic_filter import scan_topic_filter
from guards.token_limit import scan_token_limit

router = APIRouter()

# Initialize models once at startup
detoxify_model = None
try:
    if os.getenv("TESTING") == "true" or os.getenv("MOCK_DETOXIFY") == "true":
        print("Mocking Detoxify for testing mode")
    else:
        from detoxify import Detoxify
        print("Loading Detoxify model...")
        detoxify_model = Detoxify('original')
except Exception as e:
    print(f"Failed to load Detoxify model: {e}")

def run_toxicity_check(message: str, threshold: float = 0.80) -> Tuple[bool, float, Dict[str, Any]]:
    """
    Runs toxicity prediction using the pre-loaded Detoxify model, with mock fallback.
    """
    if detoxify_model is None:
        message_lower = message.lower()
        # Mock behavior for testing
        score = 0.95 if "toxicword" in message_lower else 0.05
        return score >= threshold, score, {"toxicity": score, "mocked": True}
        
    try:
        res = detoxify_model.predict(message)
        # Convert numpy float32 values to standard Python floats for JSON serialization
        scores = {k: float(v) for k, v in res.items()}
        toxicity_score = scores.get("toxicity", 0.0)
        is_blocked = toxicity_score >= threshold
        return is_blocked, toxicity_score, scores
    except Exception as e:
        print(f"Toxicity prediction error: {e}")
        return False, 0.0, {"error": str(e)}

@router.post("/guard/input", response_model=GuardInputResponse)
async def check_input(req: GuardInputRequest):
    start_time = time.time()
    
    message = req.message
    config = req.config
    
    allowed = True
    blocked_by = None
    block_reason = None
    scrubbed_message = message
    guards_triggered = []
    
    # 1. PII Scrubbing always runs first if enabled (scrub first, then check other guards)
    if config.pii_scrubbing_enabled:
        scrubbed, redactions = scan_and_scrub_pii(message, config.pii_types)
        scrubbed_message = scrubbed
        if redactions:
            max_score = max(r["score"] for r in redactions) if redactions else 0.0
            guards_triggered.append(GuardTriggeredDetail(
                guard="pii_scrubber",
                score=max_score,
                details={"redactions": redactions}
            ))

    # Subsequent guards evaluate the scrubbed_message to avoid leaking raw PII
    
    # 2. Token Limit Check (always checked if max_tokens config is present)
    token_blocked, token_count, token_details = scan_token_limit(scrubbed_message, config.max_tokens)
    guards_triggered.append(GuardTriggeredDetail(
        guard="token_limit",
        score=float(token_count) / max(1, config.max_tokens),
        details=token_details
    ))
    if token_blocked:
        allowed = False
        blocked_by = "token_limit"
        block_reason = f"Message tokens ({token_count}) exceed limit ({config.max_tokens})"
    
    # 3. Prompt Injection Check
    if allowed and config.prompt_injection_enabled:
        pi_blocked, pi_score, pi_details = scan_prompt_injection(scrubbed_message, config.prompt_injection_threshold)
        if pi_score > 0:
            guards_triggered.append(GuardTriggeredDetail(
                guard="prompt_injection",
                score=pi_score,
                details={"matched_patterns": pi_details}
            ))
        if pi_blocked:
            allowed = False
            blocked_by = "prompt_injection"
            block_reason = f"Prompt injection detected (score: {pi_score})"

    # 4. Jailbreak Check
    if allowed and config.jailbreak_enabled:
        jb_blocked, jb_score, jb_details = scan_jailbreak(scrubbed_message, config.jailbreak_threshold)
        if jb_score > 0:
            guards_triggered.append(GuardTriggeredDetail(
                guard="jailbreak",
                score=jb_score,
                details={"triggers": jb_details}
            ))
        if jb_blocked:
            allowed = False
            blocked_by = "jailbreak"
            block_reason = f"Jailbreak attempt detected (score: {jb_score})"

    # 5. Toxicity Check
    if allowed and config.toxicity_enabled:
        tox_blocked, tox_score, tox_details = run_toxicity_check(scrubbed_message, config.toxicity_threshold)
        if tox_score > 0.05:
            guards_triggered.append(GuardTriggeredDetail(
                guard="toxicity",
                score=tox_score,
                details=tox_details
            ))
        if tox_blocked:
            allowed = False
            blocked_by = "toxicity"
            block_reason = f"Toxic content detected (score: {tox_score})"

    # 6. Topic Filter Check
    if allowed and config.topic_filter_enabled:
        topic_blocked, topic_details = scan_topic_filter(scrubbed_message, config.allowed_topics)
        guards_triggered.append(GuardTriggeredDetail(
            guard="topic_filter",
            score=1.0 if topic_blocked else 0.0,
            details=topic_details
        ))
        if topic_blocked:
            allowed = False
            blocked_by = "topic_filter"
            block_reason = f"Off-topic message detected (allowed: {config.allowed_topics})"

    latency_ms = int((time.time() - start_time) * 1000)
    
    return GuardInputResponse(
        allowed=allowed,
        blocked_by=blocked_by,
        block_reason=block_reason,
        scrubbed_message=scrubbed_message,
        guards_triggered=guards_triggered,
        latency_ms=latency_ms
    )
