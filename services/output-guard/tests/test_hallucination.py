import os
import sys
from fastapi.testclient import TestClient

# Mock LiteLLM for test environment before importing app
os.environ["TESTING"] = "true"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_hallucination_disabled():
    payload = {
        "response": "This is an unrelated response to the question.",
        "original_message": "What is the capital of France?",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "block_on_hallucination": True,
            "format_validation_enabled": False
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    # Verify hallucination was not triggered or skipped
    assert not any(g["guard"] == "hallucination" for g in data["guards_triggered"])

def test_hallucination_factual():
    payload = {
        "response": "Paris is the capital of France.",
        "original_message": "What is the capital of France?",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": True,
            "block_on_hallucination": True,
            "format_validation_enabled": False
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    # Factual check should flag as false (not hallucinated)
    hallucination_guard = next(g for g in data["guards_triggered"] if g["guard"] == "hallucination")
    assert hallucination_guard["details"]["hallucination"] is False

def test_hallucination_unrelated_flagged_only():
    payload = {
        "response": "This is completely unrelated response about cats.",
        "original_message": "What is the capital of France?",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": True,
            "block_on_hallucination": False,  # Flag only
            "format_validation_enabled": False
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    # It should flag hallucination but allow it
    assert data["allowed"] is True
    hallucination_guard = next(g for g in data["guards_triggered"] if g["guard"] == "hallucination")
    assert hallucination_guard["details"]["hallucination"] is True

def test_hallucination_unrelated_blocked():
    payload = {
        "response": "This is completely unrelated response about dogs.",
        "original_message": "What is the capital of France?",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": True,
            "block_on_hallucination": True,  # Block enabled
            "format_validation_enabled": False
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    # It should flag and block
    assert data["allowed"] is False
    assert data["blocked_by"] == "hallucination"
    assert "hallucination" in data["block_reason"].lower()
