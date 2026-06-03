import { Request, Response } from 'express';
import pool from '../db/postgres';

/**
 * Retrieves aggregate analytics for a given API key and period.
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { api_key_id, period } = req.query;

    let intervalStr = '24 hours';
    let dateTrunc = 'hour';

    const p = (period as string || '').toLowerCase().trim();
    if (p === '7d') {
      intervalStr = '7 days';
      dateTrunc = 'day';
    } else if (p === '30d') {
      intervalStr = '30 days';
      dateTrunc = 'day';
    }

    const conditions = [`created_at >= NOW() - INTERVAL '${intervalStr}'`];
    const threatConditions = [`detected_at >= NOW() - INTERVAL '${intervalStr}'`];
    const values: any[] = [];

    if (api_key_id) {
      conditions.push(`api_key_id = $1`);
      threatConditions.push(`api_key_id = $1`);
      values.push(api_key_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const threatWhereClause = `WHERE ${threatConditions.join(' AND ')}`;

    // 1. Total requests count
    const totalQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const totalRes = await pool.query(totalQuery, values);
    const total_requests = parseInt(totalRes.rows[0].count, 10) || 0;

    // 2. Blocked requests count
    const blockedQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause} AND was_blocked = true`;
    const blockedRes = await pool.query(blockedQuery, values);
    const blocked_requests = parseInt(blockedRes.rows[0].count, 10) || 0;

    // 3. Block rate
    const block_rate = total_requests > 0 ? (blocked_requests / total_requests) * 100 : 0.0;

    // 4. Average latency
    const avgLatencyQuery = `SELECT AVG(latency_ms) FROM audit_logs ${whereClause}`;
    const avgLatencyRes = await pool.query(avgLatencyQuery, values);
    const average_latency_ms = Math.round(parseFloat(avgLatencyRes.rows[0].avg || '0'));

    // 5. PII detections count
    const piiQuery = `
      SELECT COUNT(*) FROM audit_logs 
      ${whereClause} AND (input_guards_triggered::text LIKE '%pii_scrubber%' OR output_guards_triggered::text LIKE '%pii_scrubber%')
    `;
    const piiRes = await pool.query(piiQuery, values);
    const pii_detections_count = parseInt(piiRes.rows[0].count, 10) || 0;

    // 6. Threats by type
    const threatsQuery = `
      SELECT threat_type, COUNT(*) as count 
      FROM threat_logs 
      ${threatWhereClause} 
      GROUP BY threat_type
    `;
    const threatsRes = await pool.query(threatsQuery, values);
    const threats_by_type: Record<string, number> = {};
    for (const row of threatsRes.rows) {
      threats_by_type[row.threat_type] = parseInt(row.count, 10);
    }

    // 7. Top threat types
    const topThreatsQuery = `
      SELECT threat_type, COUNT(*) as count 
      FROM threat_logs 
      ${threatWhereClause} 
      GROUP BY threat_type 
      ORDER BY count DESC
    `;
    const topThreatsRes = await pool.query(topThreatsQuery, values);
    const top_threat_types = topThreatsRes.rows.map((row) => ({
      threat_type: row.threat_type,
      count: parseInt(row.count, 10),
    }));

    // 8. Requests over time
    const rotQuery = `
      SELECT DATE_TRUNC('${dateTrunc}', created_at) as bucket, COUNT(*) as count 
      FROM audit_logs 
      ${whereClause} 
      GROUP BY bucket 
      ORDER BY bucket ASC
    `;
    const rotRes = await pool.query(rotQuery, values);
    const requests_over_time = rotRes.rows.map((row) => ({
      bucket: row.bucket,
      count: parseInt(row.count, 10),
    }));

    res.json({
      total_requests,
      blocked_requests,
      block_rate,
      threats_by_type,
      requests_over_time,
      top_threat_types,
      pii_detections_count,
      average_latency_ms,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * Retrieves summary statistics across all API keys.
 */
export async function getAnalyticsSummary(req: Request, res: Response): Promise<void> {
  // Reuse getAnalytics but explicitly remove api_key_id constraint
  req.query.api_key_id = undefined;
  return getAnalytics(req, res);
}
