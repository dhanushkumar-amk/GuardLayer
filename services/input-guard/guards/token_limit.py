import tiktoken
from typing import Tuple, Dict

def scan_token_limit(message: str, max_tokens: int = 2000) -> Tuple[bool, int, Dict]:
    """
    Counts the tokens of a message using tiktoken and blocks if over limit.
    Returns: (is_blocked, token_count, details)
    """
    try:
        # Defaults to cl100k_base (used by GPT-4 and GPT-3.5)
        encoding = tiktoken.get_encoding("cl100k_base")
    except Exception:
        # Fallback encoding if offline
        encoding = tiktoken.get_encoding("r50k_base")
        
    token_count = len(encoding.encode(message))
    is_blocked = token_count > max_tokens
    
    details = {
        "token_count": token_count,
        "max_tokens": max_tokens
    }
    
    return is_blocked, token_count, details
