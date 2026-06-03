from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class GuardConfig(BaseModel):
    prompt_injection_enabled: bool = True
    prompt_injection_threshold: float = 0.70
    jailbreak_enabled: bool = True
    jailbreak_threshold: float = 0.70
    pii_scrubbing_enabled: bool = True
    pii_types: List[str] = Field(default_factory=list)
    topic_filter_enabled: bool = False
    allowed_topics: List[str] = Field(default_factory=list)
    toxicity_enabled: bool = True
    toxicity_threshold: float = 0.80
    max_tokens: int = 2000

class GuardInputRequest(BaseModel):
    message: str
    config: GuardConfig

class GuardTriggeredDetail(BaseModel):
    guard: str
    score: float
    details: Dict[str, Any]

class GuardInputResponse(BaseModel):
    allowed: bool
    blocked_by: Optional[str] = None
    block_reason: Optional[str] = None
    scrubbed_message: str
    guards_triggered: List[GuardTriggeredDetail] = Field(default_factory=list)
    latency_ms: int
