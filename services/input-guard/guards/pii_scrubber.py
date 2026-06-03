import re
from typing import List, Tuple, Dict, Any
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

# 1. Custom Recognizer for Aadhaar Number (12 digit Indian ID pattern)
aadhaar_pattern = Pattern(
    name="aadhaar_pattern",
    regex=r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b",
    score=0.85
)

aadhaar_recognizer = PatternRecognizer(
    supported_entity="AADHAAR",
    patterns=[aadhaar_pattern]
)

# 2. Custom Recognizer for API Keys
api_key_pattern = Pattern(
    name="api_key_pattern",
    regex=r"\b(?:sk|gl|key)-[A-Za-z0-9_-]{20,}\b",
    score=0.85
)

api_key_recognizer = PatternRecognizer(
    supported_entity="API_KEY",
    patterns=[api_key_pattern]
)

# 3. Custom Recognizer for Passwords
password_pattern = Pattern(
    name="password_pattern",
    regex=r"\b(?:password|passwd|pwd)\s*[:=]\s*([A-Za-z0-9_@#$%-]{6,20})\b",
    score=0.85
)

password_recognizer = PatternRecognizer(
    supported_entity="PASSWORD",
    patterns=[password_pattern]
)

# Initialize engines
# We configure SpaCy NLP engine to use en_core_web_sm which is lightweight and fast
try:
    analyzer = AnalyzerEngine()
except Exception:
    analyzer = AnalyzerEngine(models_config={
        "nlp_engine_name": "spacy",
        "models": [{"model_name": "en_core_web_sm", "lang_code": "en"}]
    })

# Register custom recognizers
analyzer.registry.add_recognizer(aadhaar_recognizer)
analyzer.registry.add_recognizer(api_key_recognizer)
analyzer.registry.add_recognizer(password_recognizer)

anonymizer = AnonymizerEngine()

# Custom anonymization operators mapping
OPERATORS = {
    "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[REDACTED_EMAIL]"}),
    "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "[REDACTED_PHONE]"}),
    "CREDIT_CARD": OperatorConfig("replace", {"new_value": "[REDACTED_CREDIT_CARD]"}),
    "US_BANK_NUMBER": OperatorConfig("replace", {"new_value": "[REDACTED_BANK_ACCOUNT]"}),
    "IBAN_CODE": OperatorConfig("replace", {"new_value": "[REDACTED_BANK_ACCOUNT]"}),
    "BANK_ACCOUNT": OperatorConfig("replace", {"new_value": "[REDACTED_BANK_ACCOUNT]"}),
    "AADHAAR": OperatorConfig("replace", {"new_value": "[REDACTED_AADHAAR]"}),
    "API_KEY": OperatorConfig("replace", {"new_value": "[REDACTED_API_KEY]"}),
    "PASSWORD": OperatorConfig("replace", {"new_value": "[REDACTED_PASSWORD]"}),
}

MAP_PII_TYPES = {
    "email": ["EMAIL_ADDRESS"],
    "phone": ["PHONE_NUMBER"],
    "credit_card": ["CREDIT_CARD"],
    "bank_account": ["US_BANK_NUMBER", "IBAN_CODE", "BANK_ACCOUNT"],
    "aadhaar": ["AADHAAR"],
    "api_key": ["API_KEY"],
    "password": ["PASSWORD"],
}

def scan_and_scrub_pii(message: str, pii_types: List[str]) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Scans user input for PII elements based on config types, redacting them and returning scrubbed output.
    Returns: (scrubbed_message, list_of_redactions)
    """
    entities_to_analyze = []
    
    if not pii_types:
        # Default to all if empty list is passed
        for val in MAP_PII_TYPES.values():
            entities_to_analyze.extend(val)
    else:
        for t in pii_types:
            t_lower = t.lower()
            if t_lower in MAP_PII_TYPES:
                entities_to_analyze.extend(MAP_PII_TYPES[t_lower])
            elif t in ["EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "AADHAAR", "API_KEY", "PASSWORD", "US_BANK_NUMBER", "IBAN_CODE"]:
                entities_to_analyze.append(t)

    # Dedup entities list
    entities_to_analyze = list(set(entities_to_analyze))

    # Run analysis
    results = analyzer.analyze(
        text=message,
        language="en",
        entities=entities_to_analyze
    )

    if not results:
        return message, []

    # Build dynamic operator configuration for found entities
    custom_operators = {}
    redactions = []
    
    for r in results:
        entity = r.entity_type
        # Add to details output list
        redactions.append({
            "type": entity,
            "start": r.start,
            "end": r.end,
            "score": r.score
        })
        
        # Select operators mapping
        if entity in OPERATORS:
            custom_operators[entity] = OPERATORS[entity]
        else:
            custom_operators[entity] = OperatorConfig("replace", {"new_value": f"[REDACTED_{entity}]"})

    # Perform anonymization (replacement)
    anonymized_result = anonymizer.anonymize(
        text=message,
        analyzer_results=results,
        operators=custom_operators
    )

    return anonymized_result.text, redactions
