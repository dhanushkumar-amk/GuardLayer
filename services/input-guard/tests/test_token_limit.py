import pytest
from guards.token_limit import scan_token_limit

def test_token_limit_under():
    message = "Short message."
    is_blocked, token_count, details = scan_token_limit(message, max_tokens=10)
    assert is_blocked is False
    assert token_count > 0
    assert token_count < 10
    assert details["token_count"] == token_count

def test_token_limit_exact():
    message = "Exactly at the token count limit." # 7 tokens in cl100k_base
    is_blocked, token_count, details = scan_token_limit(message, max_tokens=token_count)
    assert is_blocked is False
    assert details["token_count"] == token_count

def test_token_limit_over():
    message = "This message is clearly going to exceed a token limit of two tokens."
    is_blocked, token_count, details = scan_token_limit(message, max_tokens=2)
    assert is_blocked is True
    assert token_count > 2
    assert details["token_count"] == token_count
