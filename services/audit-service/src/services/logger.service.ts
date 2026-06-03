import crypto from 'crypto';
import pool from '../db/postgres';

export class LoggerService {
  /**
   * Writes or updates an audit log in PostgreSQL.
   */
  async writeAuditLog(log: any): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        id, api_key_id, request_id, original_input, scrubbed_input,
        llm_response, scrubbed_response, input_guards_triggered,
        output_guards_triggered, was_blocked, block_reason, latency_ms,
        llm_provider, llm_model, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        api_key_id = EXCLUDED.api_key_id,
        request_id = EXCLUDED.request_id,
        original_input = EXCLUDED.original_input,
        scrubbed_input = EXCLUDED.scrubbed_input,
        llm_response = EXCLUDED.llm_response,
        scrubbed_response = EXCLUDED.scrubbed_response,
        input_guards_triggered = EXCLUDED.input_guards_triggered,
        output_guards_triggered = EXCLUDED.output_guards_triggered,
        was_blocked = EXCLUDED.was_blocked,
        block_reason = EXCLUDED.block_reason,
        latency_ms = EXCLUDED.latency_ms,
        llm_provider = EXCLUDED.llm_provider,
        llm_model = EXCLUDED.llm_model,
        created_at = COALESCE(EXCLUDED.created_at, audit_logs.created_at);
    `;

    const requestId = log.request_id;
    const values = [
      requestId, // Primary key id matches request_id to facilitate referencing
      log.api_key_id,
      requestId,
      log.original_input || '',
      log.scrubbed_input || '',
      log.llm_response || '',
      log.scrubbed_response || '',
      typeof log.input_guards_triggered === 'string' ? log.input_guards_triggered : JSON.stringify(log.input_guards_triggered || {}),
      typeof log.output_guards_triggered === 'string' ? log.output_guards_triggered : JSON.stringify(log.output_guards_triggered || {}),
      log.was_blocked || false,
      log.block_reason || null,
      log.latency_ms || 0,
      log.llm_provider || '',
      log.llm_model || '',
      log.created_at ? new Date(log.created_at) : new Date(),
    ];

    await pool.query(query, values);
  }

  /**
   * Writes or updates a threat log in PostgreSQL.
   * Satisfies the foreign key relation by checking/upserting the parent audit stub.
   */
  async writeThreatLog(log: any): Promise<void> {
    const requestId = log.request_id;
    
    // Ensure parent audit log row exists to prevent foreign key violation
    const ensureParentQuery = `
      INSERT INTO audit_logs (
        id, api_key_id, request_id, original_input, scrubbed_input,
        llm_response, scrubbed_response, latency_ms, llm_provider, llm_model
      ) VALUES ($1, $2, $3, '', '', '', '', 0, '', '')
      ON CONFLICT (id) DO NOTHING;
    `;
    await pool.query(ensureParentQuery, [requestId, log.api_key_id, requestId]);

    const query = `
      INSERT INTO threat_logs (
        id, api_key_id, request_id, threat_type, threat_score, original_input, detected_at, guard_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        api_key_id = EXCLUDED.api_key_id,
        request_id = EXCLUDED.request_id,
        threat_type = EXCLUDED.threat_type,
        threat_score = EXCLUDED.threat_score,
        original_input = EXCLUDED.original_input,
        detected_at = EXCLUDED.detected_at,
        guard_name = EXCLUDED.guard_name;
    `;

    const threatId = log.id || log.threat_id || crypto.randomUUID();
    const values = [
      threatId,
      log.api_key_id,
      requestId,
      log.threat_type,
      log.threat_score || 0.0,
      log.original_input || '',
      log.detected_at ? new Date(log.detected_at) : new Date(),
      log.guard_name || '',
    ];

    await pool.query(query, values);
  }
}
