import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from guards.topic_filter import scan_topic_filter

client = TestClient(app)

@patch("litellm.completion")
def test_topic_filter_on_topic(mock_completion):
    # Mocking LiteLLM completion output
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"matched": true, "detected_topic": "medical", "reason": "Mentions medical symptoms"}'
    mock_completion.return_value = mock_response

    is_blocked, details = scan_topic_filter("I have a fever and headache.", ["medical", "science"])
    assert is_blocked is False
    assert details["matched"] is True
    assert details["detected_topic"] == "medical"

@patch("litellm.completion")
def test_topic_filter_off_topic(mock_completion):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"matched": false, "detected_topic": "sports", "reason": "Questions about sports are not medical"}'
    mock_completion.return_value = mock_response

    is_blocked, details = scan_topic_filter("Who won the match yesterday?", ["medical", "science"])
    assert is_blocked is True
    assert details["matched"] is False
    assert details["detected_topic"] == "sports"

def test_topic_filter_integration_disabled():
    # When topic filter is disabled, it should be allowed and skipped
    response = client.post(
        "/guard/input",
        json={
            "message": "Who won the match yesterday?",
            "config": {
                "topic_filter_enabled": False,
                "allowed_topics": ["medical"]
            }
        }
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["allowed"] is True
    # Verify topic filter is not in triggered list (or at least did not block)
    assert res_data["blocked_by"] is None
