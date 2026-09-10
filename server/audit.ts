import crypto from 'crypto';
import { db } from './db';

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  createdAt?: string;
}

/**
 * Records an audit trail log in Database (Turso or local SQLite)
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const id = entry.id || `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = entry.createdAt || new Date().toISOString();
    const detailsJson = entry.details ? JSON.stringify(entry.details) : null;

    await db.run(
      `INSERT INTO audit_logs (
        id, user_id, user_name, action, entity_type, entity_id, details_json, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.userId || 'SISTEMA',
        entry.userName || 'Sistema / Anônimo',
        entry.action,
        entry.entityType,
        entry.entityId || null,
        detailsJson,
        entry.ipAddress || null,
        createdAt,
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Queries audit logs with pagination and filters
 */
export async function getAuditLogs(params: {
  limit?: number;
  offset?: number;
  entityType?: string;
  userId?: string;
  action?: string;
}): Promise<{ logs: any[]; total: number }> {
  let whereClauses: string[] = [];
  let queryParams: any[] = [];

  if (params.entityType) {
    whereClauses.push('entity_type = ?');
    queryParams.push(params.entityType);
  }
  if (params.userId) {
    whereClauses.push('user_id = ?');
    queryParams.push(params.userId);
  }
  if (params.action) {
    whereClauses.push('action LIKE ?');
    queryParams.push(`%${params.action}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const countRes = await db.get<{ total: number }>(`SELECT COUNT(*) as total FROM audit_logs ${whereSql}`, queryParams);
  const total = countRes ? Number(countRes.total) : 0;

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const rows = await db.all<any>(
    `SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset]
  );

  const logs = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details_json ? JSON.parse(row.details_json) : null,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  }));

  return { logs, total };
}
