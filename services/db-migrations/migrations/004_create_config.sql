CREATE TABLE IF NOT EXISTS config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    prompt_injection_enabled BOOLEAN NOT NULL DEFAULT true,
    prompt_injection_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.70,
    jailbreak_enabled BOOLEAN NOT NULL DEFAULT true,
    jailbreak_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.70,
    pii_scrubbing_enabled BOOLEAN NOT NULL DEFAULT true,
    pii_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    topic_filter_enabled BOOLEAN NOT NULL DEFAULT false,
    allowed_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    toxicity_enabled BOOLEAN NOT NULL DEFAULT true,
    toxicity_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.80,
    max_tokens INTEGER NOT NULL DEFAULT 2000,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Establish mutual relationship with api_keys
ALTER TABLE api_keys 
ADD CONSTRAINT fk_api_keys_config 
FOREIGN KEY (config_id) REFERENCES config(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_config_api_key_id ON config(api_key_id);
