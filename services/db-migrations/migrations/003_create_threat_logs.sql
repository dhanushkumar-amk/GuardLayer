CREATE TABLE IF NOT EXISTS threat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES audit_logs(id) ON DELETE CASCADE,
    threat_type TEXT NOT NULL,
    threat_score DECIMAL(5,2) NOT NULL,
    original_input TEXT NOT NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guard_name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threat_logs_api_key_id ON threat_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_threat_logs_request_id ON threat_logs(request_id);
