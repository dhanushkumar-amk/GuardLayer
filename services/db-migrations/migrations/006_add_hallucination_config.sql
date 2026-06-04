-- Add hallucination config columns to config table
ALTER TABLE config 
ADD COLUMN IF NOT EXISTS hallucination_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS block_on_hallucination BOOLEAN NOT NULL DEFAULT false;
