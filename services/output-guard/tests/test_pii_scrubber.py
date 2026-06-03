import os
import sys
from fastapi.testclient import TestClient

# Ensure output-guard directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from guards.pii_scrubber import scan_and_scrub_pii

client = TestClient(app)

def test_scan_and_scrub_pii_direct():
    # Email
    message = "Contact me at test.user@example.com for info."
    scrubbed, redactions = scan_and_scrub_pii(message, ["email"])
    assert "test.user@example.com" not in scrubbed
    assert "[REDACTED_EMAIL]" in scrubbed
    assert len(redactions) == 1
    assert redactions[0]["type"] == "EMAIL_ADDRESS"

    # Phone
    message = "Call me at +1-555-019-2834."
    scrubbed, redactions = scan_and_scrub_pii(message, ["phone"])
    assert "+1-555-019-2834" not in scrubbed
    assert "[REDACTED_PHONE]" in scrubbed
    assert len(redactions) == 1
    assert redactions[0]["type"] == "PHONE_NUMBER"

    # Aadhaar
    message = "My Aadhaar ID is 1234-5678-9012."
    scrubbed, redactions = scan_and_scrub_pii(message, ["aadhaar"])
    assert "1234-5678-9012" not in scrubbed
    assert "[REDACTED_AADHAAR]" in scrubbed
    assert len(redactions) == 1
    assert redactions[0]["type"] == "AADHAAR"

    # Multiple
    message = "User test@email.com with phone 555-123-4567."
    scrubbed, redactions = scan_and_scrub_pii(message, ["email", "phone"])
    assert "test@email.com" not in scrubbed
    assert "555-123-4567" not in scrubbed
    assert "[REDACTED_EMAIL]" in scrubbed
    assert "[REDACTED_PHONE]" in scrubbed
    assert len(redactions) >= 2

    # Clean
    message = "Hello, world! This contains no PII."
    scrubbed, redactions = scan_and_scrub_pii(message, [])
    assert scrubbed == message
    assert len(redactions) == 0

def test_api_pii_scrubber_endpoint():
    payload = {
        "response": "My email is developer@example.com and phone is +1-555-019-2834. Also my Aadhaar is 9876 5432 1098.",
        "original_message": "What is your contact info and Aadhaar?",
        "config": {
            "pii_scrubbing_enabled": True,
            "pii_types": ["email", "phone", "aadhaar"],
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "format_validation_enabled": False
        }
    }
    
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # PII scrubbing never blocks
    assert data["allowed"] is True
    assert data["blocked_by"] is None
    assert data["block_reason"] is None
    
    # Redactions check
    assert "developer@example.com" not in data["scrubbed_response"]
    assert "+1-555-019-2834" not in data["scrubbed_response"]
    assert "9876 5432 1098" not in data["scrubbed_response"]
    
    assert "[REDACTED_EMAIL]" in data["scrubbed_response"]
    assert "[REDACTED_PHONE]" in data["scrubbed_response"]
    assert "[REDACTED_AADHAAR]" in data["scrubbed_response"]
    
    assert len(data["guards_triggered"]) == 1
    assert data["guards_triggered"][0]["guard"] == "pii_scrubber"
    assert len(data["guards_triggered"][0]["details"]["redactions"]) >= 3
