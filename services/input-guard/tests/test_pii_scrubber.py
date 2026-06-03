import pytest
from guards.pii_scrubber import scan_and_scrub_pii

def test_pii_scrubber_email():
    message = "Contact me at test.user@example.com for info."
    scrubbed, redactions = scan_and_scrub_pii(message, ["email"])
    assert "test.user@example.com" not in scrubbed
    assert "[REDACTED_EMAIL]" in scrubbed
    assert len(redactions) == 1
    assert redactions[0]["type"] == "EMAIL_ADDRESS"

def test_pii_scrubber_phone():
    message = "Call me at +1-555-019-2834."
    scrubbed, redactions = scan_and_scrub_pii(message, ["phone"])
    assert "+1-555-019-2834" not in scrubbed
    assert "[REDACTED_PHONE]" in scrubbed
    assert len(redactions) == 1
    assert redactions[0]["type"] == "PHONE_NUMBER"

def test_pii_scrubber_aadhaar():
    # 12-digit Aadhaar number check
    message = "My Aadhaar ID is 1234-5678-9012."
    scrubbed, redactions = scan_and_scrub_pii(message, ["aadhaar"])
    assert "1234-5678-9012" not in scrubbed
    assert "[REDACTED_AADHAAR]" in scrubbed
    assert len(redactions) == 1
    assert redactions[0]["type"] == "AADHAAR"

def test_pii_scrubber_credit_card():
    # Standard dummy credit card format
    message = "Card number: 4111 1111 1111 1111."
    scrubbed, redactions = scan_and_scrub_pii(message, ["credit_card"])
    assert "4111 1111 1111 1111" not in scrubbed
    assert "[REDACTED_CREDIT_CARD]" in scrubbed
    assert len(redactions) == 1
    assert redactions[0]["type"] == "CREDIT_CARD"

def test_pii_scrubber_multiple():
    message = "User test@email.com with phone 555-123-4567 and card 4111-1111-1111-1111."
    scrubbed, redactions = scan_and_scrub_pii(message, ["email", "phone", "credit_card"])
    assert "test@email.com" not in scrubbed
    assert "555-123-4567" not in scrubbed
    assert "4111-1111-1111-1111" not in scrubbed
    assert "[REDACTED_EMAIL]" in scrubbed
    assert "[REDACTED_PHONE]" in scrubbed
    assert "[REDACTED_CREDIT_CARD]" in scrubbed
    assert len(redactions) >= 3

def test_pii_scrubber_clean():
    message = "Hello, world! This contains no PII information whatsoever."
    scrubbed, redactions = scan_and_scrub_pii(message, [])
    assert scrubbed == message
    assert len(redactions) == 0
