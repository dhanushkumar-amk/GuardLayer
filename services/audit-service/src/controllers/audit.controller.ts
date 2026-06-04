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

/**
 * Deletes all audit logs from the database.
 */
export async function clearAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    await pool.query('DELETE FROM audit_logs');
    res.json({ success: true, message: 'All audit logs have been successfully cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * Helper to format a cell value for CSV encoding.
 */
export function formatCSVCell(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }
  if (typeof val === 'boolean') {
    return val ? '"true"' : '"false"';
  }
  if (val instanceof Date) {
    return `"${val.toISOString().replace(/\.\d{3}/, '')}"`;
  }
  if (typeof val === 'object') {
    const str = JSON.stringify(val);
    return `"${str.replace(/"/g, '""')}"`;
  }
  const strVal = String(val);
  return `"${strVal.replace(/"/g, '""')}"`;
}

/**
 * Helper to parse and format the list of guards triggered.
 */
function formatGuardsList(row: any): string {
  const list: string[] = [];
  const parseField = (field: any) => {
    if (!field) return;
    try {
      const obj = typeof field === 'string' ? JSON.parse(field) : field;
      Object.entries(obj).forEach(([name, status]) => {
        if (status === true || (status as any).triggered === true || (status as any).score > 0) {
          list.push(name.replace(/_guard$|_shield$/i, '').replace(/_/g, ' '));
        }
      });
    } catch (e) {
      if (typeof field === 'string' && field.length > 2) {
        list.push(field);
      }
    }
  };
  parseField(row.input_guards_triggered);
  parseField(row.output_guards_triggered);
  return Array.from(new Set(list)).join(', ');
}

/**
 * Streams audit logs filtered by query parameters as a CSV download.
 */
export async function exportAuditLogs(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  try {
    const { api_key_id, from_date, to_date, was_blocked } = req.query;

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

    if (from_date) {
      conditions.push(`created_at >= $${conditions.length + 1}`);
      values.push(new Date(from_date as string));
    }

    if (to_date) {
      conditions.push(`created_at <= $${conditions.length + 1}`);
      values.push(new Date(to_date as string));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    await client.query('BEGIN');
    
    const cursorName = `audit_cursor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const declareQuery = `DECLARE ${cursorName} CURSOR FOR SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC`;
    await client.query(declareQuery, values);

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="guardlayer-audit-${dateStr}.csv"`);

    const headers = [
      'Request ID', 'API Key', 'Time', 'Original Input', 'Scrubbed Input',
      'LLM Response', 'Was Blocked', 'Block Reason', 'Guards Triggered',
      'Latency MS', 'Provider', 'Model'
    ];
    res.write('\ufeff' + headers.map(formatCSVCell).join(',') + '\n');

    let hasMore = true;
    while (hasMore) {
      const fetchResult = await client.query(`FETCH 100 FROM ${cursorName}`);
      if (fetchResult.rows.length === 0) {
        hasMore = false;
      } else {
        for (const row of fetchResult.rows) {
          const line = [
            formatCSVCell(row.request_id),
            formatCSVCell(row.api_key_id),
            formatCSVCell(row.created_at),
            formatCSVCell(row.original_input),
            formatCSVCell(row.scrubbed_input),
            formatCSVCell(row.llm_response),
            formatCSVCell(row.was_blocked),
            formatCSVCell(row.block_reason),
            formatCSVCell(formatGuardsList(row)),
            formatCSVCell(row.latency_ms),
            formatCSVCell(row.llm_provider),
            formatCSVCell(row.llm_model)
          ].join(',') + '\n';

          const ok = res.write(line);
          if (!ok) {
            await new Promise((resolve) => res.once('drain', resolve));
          }
        }
      }
    }

    await client.query(`CLOSE ${cursorName}`);
    await client.query('COMMIT');
    res.end();
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      // ignore rollback errors if connection was broken
    }
    console.error('Export Audit Logs Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    } else {
      res.end();
    }
  } finally {
    client.release();
  }
}
