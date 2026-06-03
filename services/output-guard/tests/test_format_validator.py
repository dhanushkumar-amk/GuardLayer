import os
import sys
from fastapi.testclient import TestClient

os.environ["TESTING"] = "true"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_format_validation_disabled():
    payload = {
        "response": "{invalid json",
        "original_message": "Give me JSON.",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "format_validation_enabled": False,
            "expected_format": "JSON"
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert not any(g["guard"] == "format_validator" for g in data["guards_triggered"])

def test_format_validation_valid_json():
    payload = {
        "response": '{"status": "success", "data": [1, 2, 3]}',
        "original_message": "Give me JSON.",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "format_validation_enabled": True,
            "expected_format": "JSON"
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    fmt_guard = next(g for g in data["guards_triggered"] if g["guard"] == "format_validator")
    assert fmt_guard["details"]["valid"] is True

def test_format_validation_invalid_json():
    payload = {
        "response": '{"status": "success", "data": [1, 2, 3}',  # Missing closing square/curly brackets
        "original_message": "Give me JSON.",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "format_validation_enabled": True,
            "expected_format": "JSON"
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["blocked_by"] == "format_validator"
    assert "Invalid JSON" in data["block_reason"]

def test_format_validation_empty_response():
    payload = {
        "response": "",
        "original_message": "Say something.",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "format_validation_enabled": True,
            "expected_format": "plain text"
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["blocked_by"] == "format_validator"
    assert "empty" in data["block_reason"].lower()

def test_format_validation_whitespace_response():
    payload = {
        "response": "   \n  \t   ",
        "original_message": "Say something.",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "format_validation_enabled": True,
            "expected_format": "plain text"
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["blocked_by"] == "format_validator"
    assert "whitespace" in data["block_reason"].lower()

def test_format_validation_plain_text():
    payload = {
        "response": "Here is some plain text.",
        "original_message": "Say something.",
        "config": {
            "pii_scrubbing_enabled": False,
            "toxicity_enabled": False,
            "hallucination_enabled": False,
            "format_validation_enabled": True,
            "expected_format": "plain text"
        }
    }
    response = client.post("/guard/output", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    fmt_guard = next(g for g in data["guards_triggered"] if g["guard"] == "format_validator")
    assert fmt_guard["details"]["valid"] is True
