import re
import base64
from typing import Tuple, List

# Base64 regex to extract valid looking base64 strings (at least 8 chars long)
B64_REGEX = re.compile(r'\b[A-Za-z0-9+/]{8,}=*\b')

ROLEPLAY_PATTERNS = ["pretend you are", "act as if", "you are playing"]
HYPOTHETICAL_PATTERNS = ["hypothetically speaking", "in a fictional world", "fictional scenario", "for educational purposes only"]
JAILBREAK_KEYWORDS = ["ignore", "system", "jailbreak", "bypass", "dan", "instruction", "flag", "secret", "rules"]

def scan_jailbreak(message: str, threshold: float = 0.70) -> Tuple[bool, float, List[str]]:
    """
    Scans user input for roleplay bypass, base64 payloads, hypothetical framing, and token smuggling.
    Returns: (is_blocked, score, triggers)
    """
    message_lower = message.lower()
    triggers = []
    score = 0.0

    # 1. Roleplay bypass
    for pattern in ROLEPLAY_PATTERNS:
        if pattern in message_lower:
            triggers.append(f"roleplay_bypass({pattern})")
            score += 0.4

    # 2. Hypothetical framing
    for pattern in HYPOTHETICAL_PATTERNS:
        if pattern in message_lower:
            triggers.append(f"hypothetical_framing({pattern})")
            score += 0.4

    # 3. Base64 payload detection & decoding
    b64_matches = B64_REGEX.findall(message)
    for match in b64_matches:
        try:
            # Add padding if needed
            padded = match + "=" * ((4 - len(match) % 4) % 4)
            decoded = base64.b64decode(padded.encode('ascii', errors='ignore')).decode('utf-8', errors='ignore').lower()
            for kw in JAILBREAK_KEYWORDS:
                if kw in decoded:
                    triggers.append(f"base64_payload({kw})")
                    score += 0.5
                    break
        except Exception:
            continue

    # 4. Token smuggling (Unicode math/fullwidth symbols)
    smuggled_chars = []
    for char in message:
        val = ord(char)
        if (0x1D400 <= val <= 0x1D7FF) or (0xFF00 <= val <= 0xFFEF):
            smuggled_chars.append(char)
            
    if smuggled_chars:
        triggers.append(f"token_smuggling_unicode(count={len(smuggled_chars)})")
        score += 0.4

    score = min(1.0, score)
    is_blocked = score >= threshold
    
    return is_blocked, score, triggers
