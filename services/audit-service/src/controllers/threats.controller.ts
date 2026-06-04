import { Request, Response } from 'express';
import pool from '../db/postgres';
import { formatCSVCell } from './audit.controller';

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

// Global array of SSE clients
export const sseClients: Response[] = [];

/**
 * Controller to handle SSE stream connections for real-time threat alerts.
 */
export function streamThreatLogs(req: Request, res: Response): void {
  // Write headers immediately to flush connection through gateway proxy
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial message to establish connection immediately
  res.write('data: {"status":"connected"}\n\n');

  // Keep-alive heartbeat every 10 seconds to prevent browser/proxy timeout
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 10000);

  // Add the client response to the array
  sseClients.push(res);

  // Handle client disconnection
  req.on('close', () => {
    clearInterval(keepAlive);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
}

/**
 * Deletes all threat logs from the database.
 */
export async function clearThreatLogs(req: Request, res: Response): Promise<void> {
  try {
    await pool.query('DELETE FROM threat_logs');
    res.json({ success: true, message: 'All threat logs have been successfully cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * Streams threat logs filtered by query parameters as a CSV download.
 */
export async function exportThreatLogs(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  try {
    const { api_key_id, threat_type, from_date, to_date } = req.query;

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

    await client.query('BEGIN');
    
    const cursorName = `threat_cursor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const declareQuery = `DECLARE ${cursorName} CURSOR FOR SELECT * FROM threat_logs ${whereClause} ORDER BY detected_at DESC`;
    await client.query(declareQuery, values);

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="guardlayer-threats-${dateStr}.csv"`);

    const headers = [
      'Threat ID', 'API Key', 'Threat Type', 'Score', 'Guard Name', 'Original Input', 'Detected At'
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
            formatCSVCell(row.id),
            formatCSVCell(row.api_key_id),
            formatCSVCell(row.threat_type),
            formatCSVCell(row.threat_score),
            formatCSVCell(row.guard_name),
            formatCSVCell(row.original_input),
            formatCSVCell(row.detected_at)
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
    console.error('Export Threat Logs Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    } else {
      res.end();
    }
  } finally {
    client.release();
  }
}
