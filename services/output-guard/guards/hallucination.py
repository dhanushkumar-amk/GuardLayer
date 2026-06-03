import os
from typing import Tuple, Dict, Any

def check_hallucination(original_message: str, response: str) -> Tuple[bool, float, Dict[str, Any]]:
    """
    Checks if LLM response is consistent with the original message using LiteLLM.
    Returns: (is_hallucination, confidence, details)
    """
    if os.getenv("TESTING") == "true" or os.getenv("MOCK_LITELLM") == "true":
        # Mock behavior for testing
        response_lower = response.lower()
        
        if "unrelated" in response_lower or "hallucination" in response_lower:
            return True, 0.90, {"hallucination": True, "confidence": 0.90, "mocked": True}
        
        return False, 0.95, {"hallucination": False, "confidence": 0.95, "mocked": True}

    # Lazy import to avoid loading issues at start if not used
    import litellm

    model = os.getenv("LITELLM_MODEL", "gpt-3.5-turbo")
    
    prompt = f"""You are a strict hallucination detection system.
Analyze if the following LLM Response is factually consistent and relevantly answers the Original Question/Message.

Original Question/Message:
\"\"\"{original_message}\"\"\"

LLM Response:
\"\"\"{response}\"\"\"

Does this response answer this question factually? Reply only YES or NO. Do not include any other text.
"""

    try:
        completion = litellm.completion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=5
        )
        llm_reply = completion.choices[0].message.content.strip().upper()
        
        # If LLM reply contains "NO", we flag it as a hallucination
        is_hallucination = "NO" in llm_reply
        confidence = 0.90 if is_hallucination else 0.95
        
        return is_hallucination, confidence, {
            "hallucination": is_hallucination,
            "confidence": confidence,
            "raw_response": llm_reply
        }
    except Exception as e:
        print(f"Error in hallucination checking: {e}")
        return False, 0.0, {"error": str(e), "hallucination": False, "confidence": 0.0}
