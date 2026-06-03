import os
import sys
import pytest
from fastapi.testclient import TestClient

# Mock Detoxify for test environment before importing app
os.environ["TESTING"] = "true"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from guards.toxicity import check_toxicity

client = TestClient(app)

def test_toxicity_direct():
    # Toxic response
    is_blocked, max_score, scores, triggered = check_toxicity("This is clearly toxic", threshold=0.80)
    assert is_blocked is True
    assert max_score >= 0.80
    assert triggered == "toxicity"
    assert "toxicity" in scores

    # Clean response
    is_blocked, max_score, scores, triggered = check_toxicity("Thank you for your help!", threshold=0.80)
    assert is_blocked is False
    assert max_score < 0.80
    assert triggered is None
    assert all(k in scores for k in ["toxicity", "severe_toxicity", "obscene", "threat", "insult", "identity_attack"])

def test_api_toxicity_endpoints():
    # 1. Clearly toxic response
    payload = {
        "response": "This is a clearly toxic response.",
        "original_message": "Tell me something.",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": True,
            "toxicity_threshold": 0.80,
            "hallucination_enabled": False,
            "format_validation_enabled": False
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["blocked_by"] == "toxicity"
    assert "toxicity" in data["block_reason"]
    assert any(g["guard"] == "toxicity" for g in data["guards_triggered"])

    # 2. Clean helpful response
    payload["response"] = "Here is a clean helpful response to your question."
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert data["blocked_by"] is None
    
    # All 6 scores returned always in details
    tox_trigger = next(g for g in data["guards_triggered"] if g["guard"] == "toxicity")
    assert all(k in tox_trigger["details"] for k in ["toxicity", "severe_toxicity", "obscene", "threat", "insult", "identity_attack"])

    # 3. Response with insult
    payload["response"] = "You are a complete insult to intelligence."
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["blocked_by"] == "toxicity"
    assert "insult" in data["block_reason"]

    # 4. Threshold test: just below threshold (0.79)
    payload["response"] = "Response that is score_0_79 just below threshold"
    payload["config"]["toxicity_threshold"] = 0.80
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True

    # 5. Threshold test: just above threshold (0.81)
    payload["response"] = "Response that is score_0_81 just above threshold"
    payload["config"]["toxicity_threshold"] = 0.80
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["blocked_by"] == "toxicity"
