import { Request, Response } from 'express';
import pool from '../db/postgres';

/**
 * Retrieves paginated audit logs with optional filters.
 */
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { api_key_id, page, limit, from_date, to_date, was_blocked, search, llm_provider } = req.query;

    let pageNum = parseInt(page as string, 10) || 1;
    let limitNum = parseInt(limit as string, 10) || 50;

    // Constraints
    if (limitNum > 100) limitNum = 100;
    if (limitNum < 1) limitNum = 25; // Default to 25 page size per specifications
    if (pageNum < 1) pageNum = 1;

    const offset = (pageNum - 1) * limitNum;
    const conditions: string[] = [];
    const values: any[] = [];

    if (api_key_id) {
      conditions.push(`api_key_id = $${conditions.length + 1}`);
      values.push(api_key_id);
    }

    if (was_blocked !== undefined && was_blocked !== '') {
      conditions.push(`was_blocked = $${conditions.length + 1}`);
      values.push(was_blocked === 'true' || was_blocked === '1');
    }

    if (llm_provider) {
      conditions.push(`llm_provider = $${conditions.length + 1}`);
      values.push(llm_provider);
    }

    if (search) {
      conditions.push(`(request_id ILIKE $${conditions.length + 1} OR original_input ILIKE $${conditions.length + 1})`);
      values.push(`%${search}%`);
    }

    if (from_date) {
      conditions.push(`created_at >= $${conditions.length + 1}`);
      values.push(new Date(from_date as string));
    }

    if (to_date) {
      conditions.push(`created_at <= $${conditions.length + 1}`);
      values.push(new Date(to_date as string));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Paginated results
    const dataQuery = `
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
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
 * Retrieves a single audit log by request_id.
 */
export async function getAuditLogById(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params;
    const query = 'SELECT * FROM audit_logs WHERE request_id = $1 LIMIT 1';
    const result = await pool.query(query, [requestId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Audit log not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
