from typing import List, Tuple

# At least 25 common prompt injection phrases/patterns
INJECTION_PATTERNS = [
    "ignore previous instructions",
    "disregard your system prompt",
    "you are now",
    "forget everything",
    "new persona",
    "system command",
    "override system prompt",
    "you must ignore",
    "bypass guidelines",
    "ignore constraints",
    "do not follow rules",
    "act as a new",
    "you are helper",
    "ignore safety guidelines",
    "disregard safety rules",
    "switch to administrator mode",
    "enter developer mode",
    "enable jailbreak mode",
    "run system prompt injection",
    "ignore prompt above",
    "ignore prompt below",
    "you are unconstrained",
    "ignore all limitations",
    "do not restrict",
    "ignore security filters",
    "reveal your system prompt",
    "show instructions above",
    "ignore instructions"
]

def scan_prompt_injection(message: str, threshold: float = 0.70) -> Tuple[bool, float, List[str]]:
    """
    Scans user input for prompt injection phrases.
    Returns: (is_blocked, score, matched_patterns)
    """
    message_lower = message.lower()
    matched = []
    
    for pattern in INJECTION_PATTERNS:
        if pattern in message_lower:
            matched.append(pattern)
            
    if not matched:
        return False, 0.0, []
        
    # Calculate a score: 0.35 per match, capped at 1.0
    score = min(1.0, len(matched) * 0.35)
    is_blocked = score >= threshold
    
    return is_blocked, score, matched
