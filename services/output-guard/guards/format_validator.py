import json
from typing import Tuple, Dict, Any

def validate_format(response: str, expected_format: str) -> Tuple[bool, float, Dict[str, Any]]:
    """
    Validates output format (JSON, markdown, plain text).
    Empty or whitespace-only response is always blocked when format validator is enabled.
    Returns: (is_blocked, score, details)
    """
    if not response or not response.strip():
        return True, 1.0, {
            "valid": False,
            "error": "Response is empty or contains only whitespace",
            "expected_format": expected_format
        }

    fmt = expected_format.strip().lower()
    
    if fmt == "json":
        try:
            json.loads(response)
            return False, 0.0, {
                "valid": True,
                "expected_format": expected_format
            }
        except json.JSONDecodeError as e:
            return True, 1.0, {
                "valid": False,
                "error": f"Invalid JSON: {str(e)}",
                "expected_format": expected_format
            }
            
    elif fmt == "markdown":
        # Any non-empty string is valid markdown
        return False, 0.0, {
            "valid": True,
            "expected_format": expected_format
        }
        
    elif fmt in ["plain text", "plain_text", "text"]:
        return False, 0.0, {
            "valid": True,
            "expected_format": expected_format
        }
        
    else:
        # Fallback for unrecognized expected format
        return False, 0.0, {
            "valid": True,
            "expected_format": expected_format,
            "unknown_format": True
        }
