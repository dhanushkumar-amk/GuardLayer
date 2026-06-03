from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OutputGuardConfig(BaseModel):
    pii_scrubbing_enabled: bool = True
    pii_types: List[str] = Field(default_factory=list)
    
    toxicity_enabled: bool = True
    toxicity_threshold: float = 0.80
    
    hallucination_enabled: bool = False
    block_on_hallucination: bool = False
    
    format_validation_enabled: bool = False
    expected_format: str = "plain text"  # options: "JSON", "markdown", "plain text"

class GuardOutputRequest(BaseModel):
    response: str
    original_message: str
    config: OutputGuardConfig

class GuardTriggeredDetail(BaseModel):
    guard: str
    score: float
    details: Dict[str, Any]

class GuardOutputResponse(BaseModel):
    allowed: bool
    blocked_by: Optional[str] = None
    block_reason: Optional[str] = None
    scrubbed_response: str
    guards_triggered: List[GuardTriggeredDetail] = Field(default_factory=list)
    latency_ms: int
