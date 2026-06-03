import time
from fastapi import APIRouter
from models.schemas import GuardOutputRequest, GuardOutputResponse, GuardTriggeredDetail
from guards.pii_scrubber import scan_and_scrub_pii
from guards.toxicity import check_toxicity, init_model
from guards.hallucination import check_hallucination
from guards.format_validator import validate_format

# Load Detoxify model once at startup
init_model()

router = APIRouter()

@router.post("/guard/output", response_model=GuardOutputResponse)
async def check_output(req: GuardOutputRequest):
    start_time = time.time()
    
    response_text = req.response
    original_message = req.original_message
    config = req.config
    
    allowed = True
    blocked_by = None
    block_reason = None
    scrubbed_response = response_text
    guards_triggered = []
    
    # 1. PII scrubbing always runs first if enabled
    if config.pii_scrubbing_enabled:
        scrubbed_response, redactions = scan_and_scrub_pii(response_text, config.pii_types)
        if redactions:
            max_score = max(r["score"] for r in redactions) if redactions else 0.85
            guards_triggered.append(GuardTriggeredDetail(
                guard="pii_scrubber",
                score=max_score,
                details={"redactions": redactions}
            ))

    # 2. Toxicity Check
    if config.toxicity_enabled:
        tox_blocked, tox_score, tox_details, triggered_type = check_toxicity(scrubbed_response, config.toxicity_threshold)
        
        # All six Detoxify scores returned in details always
        # Add toxicity to triggered list
        guards_triggered.append(GuardTriggeredDetail(
            guard="toxicity",
            score=tox_score,
            details=tox_details
        ))
            
        if tox_blocked:
            allowed = False
            blocked_by = "toxicity"
            block_reason = f"Toxic response blocked by {triggered_type} guard (score: {tox_score:.2f}, threshold: {config.toxicity_threshold:.2f})"
            
            # If toxicity blocks — return immediately
            latency_ms = int((time.time() - start_time) * 1000)
            return GuardOutputResponse(
                allowed=allowed,
                blocked_by=blocked_by,
                block_reason=block_reason,
                scrubbed_response=scrubbed_response,
                guards_triggered=guards_triggered,
                latency_ms=latency_ms
            )

    # 3. Hallucination Check
    if config.hallucination_enabled:
        is_hallucination, confidence, details = check_hallucination(original_message, scrubbed_response)
        
        guards_triggered.append(GuardTriggeredDetail(
            guard="hallucination",
            score=confidence if is_hallucination else (1.0 - confidence),
            details=details
        ))
        
        if is_hallucination and config.block_on_hallucination:
            allowed = False
            blocked_by = "hallucination"
            block_reason = f"Potential hallucination detected"

    # 4. Format Validation Check
    if config.format_validation_enabled:
        fmt_blocked, fmt_score, fmt_details = validate_format(scrubbed_response, config.expected_format)
        
        guards_triggered.append(GuardTriggeredDetail(
            guard="format_validator",
            score=fmt_score,
            details=fmt_details
        ))
            
        if fmt_blocked and allowed:  # Only set if not already blocked
            allowed = False
            blocked_by = "format_validator"
            block_reason = fmt_details.get("error", "Format validation failed")

    latency_ms = int((time.time() - start_time) * 1000)
    
    return GuardOutputResponse(
        allowed=allowed,
        blocked_by=blocked_by,
        block_reason=block_reason,
        scrubbed_response=scrubbed_response,
        guards_triggered=guards_triggered,
        latency_ms=latency_ms
    )
