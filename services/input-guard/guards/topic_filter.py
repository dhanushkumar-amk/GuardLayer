import litellm
import os
import json
from typing import List, Tuple, Dict

def scan_topic_filter(message: str, allowed_topics: List[str]) -> Tuple[bool, Dict]:
    """
    Classifies if the message is on one of the allowed topics using LiteLLM.
    Returns: (is_blocked, details)
    """
    if not allowed_topics:
        return False, {"matched": True, "reason": "No allowed topics specified", "detected_topic": "any"}

    # Prompt for classification
    prompt = f"""
You are a topic classification assistant.
Determine if the following user message belongs to any of the allowed topics:
Allowed Topics: {allowed_topics}

User Message: "{message}"

Respond strictly in raw JSON format (no markdown code blocks, no other text) like:
{{
  "matched": true or false,
  "detected_topic": "the matched topic or 'none'",
  "reason": "explanation of classification"
}}
"""

    try:
        model = os.getenv("LITELLM_MODEL", "gpt-3.5-turbo")
        
        response = litellm.completion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean markdown code block if present
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0].strip()
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0].strip()
            
        data = json.loads(content)
        matched = data.get("matched", False)
        
        is_blocked = not matched
        return is_blocked, {
            "matched": matched,
            "detected_topic": data.get("detected_topic", "unknown"),
            "reason": data.get("reason", "Classified via LiteLLM")
        }
    except Exception as e:
        # Resilient fallback keyword matching for offline testing and setup
        message_lower = message.lower()
        matched = False
        detected = "none"
        for topic in allowed_topics:
            if topic.lower() in message_lower:
                matched = True
                detected = topic
                break
        
        is_blocked = not matched
        return is_blocked, {
            "matched": matched,
            "detected_topic": detected,
            "reason": f"Fallback keyword match (LiteLLM call bypassed/failed: {str(e)})"
        }
