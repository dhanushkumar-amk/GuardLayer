CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    original_input TEXT NOT NULL,
    scrubbed_input TEXT NOT NULL,
    llm_response TEXT NOT NULL,
    scrubbed_response TEXT NOT NULL,
    input_guards_triggered JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_guards_triggered JSONB NOT NULL DEFAULT '{}'::jsonb,
    was_blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason TEXT,
    latency_ms INTEGER NOT NULL,
    llm_provider TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_api_key_id ON audit_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
