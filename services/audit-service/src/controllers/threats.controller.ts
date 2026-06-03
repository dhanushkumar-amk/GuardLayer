import { Request, Response } from 'express';
import pool from '../db/postgres';

/**
 * Retrieves paginated threat logs with optional filters.
 */
export async function getThreatLogs(req: Request, res: Response): Promise<void> {
  try {
    const { api_key_id, threat_type, page, limit, from_date, to_date } = req.query;

    let pageNum = parseInt(page as string, 10) || 1;
    let limitNum = parseInt(limit as string, 10) || 50;

    // Constraints
    if (limitNum > 100) limitNum = 100;
    if (limitNum < 1) limitNum = 50;
    if (pageNum < 1) pageNum = 1;

    const offset = (pageNum - 1) * limitNum;
    const conditions: string[] = [];
    const values: any[] = [];

    if (api_key_id) {
      conditions.push(`api_key_id = $${conditions.length + 1}`);
      values.push(api_key_id);
    }

    if (threat_type) {
      conditions.push(`threat_type = $${conditions.length + 1}`);
      values.push(threat_type);
    }

    if (from_date) {
      conditions.push(`detected_at >= $${conditions.length + 1}`);
      values.push(new Date(from_date as string));
    }

    if (to_date) {
      conditions.push(`detected_at <= $${conditions.length + 1}`);
      values.push(new Date(to_date as string));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countQuery = `SELECT COUNT(*) FROM threat_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Paginated results
    const dataQuery = `
      SELECT * FROM threat_logs
      ${whereClause}
      ORDER BY detected_at DESC
      LIMIT $${conditions.length + 1} OFFSET $${conditions.length + 2}
    `;
    const dataResult = await pool.query(dataQuery, [...values, limitNum, offset]);

    res.json({
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * Retrieves the last 20 threat logs across all API keys.
 */
export async function getRecentThreats(req: Request, res: Response): Promise<void> {
  try {
    const query = 'SELECT * FROM threat_logs ORDER BY detected_at DESC LIMIT 20';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
