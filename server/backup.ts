import fs from 'fs';
import path from 'path';
import { db, ensureDirectories, persistDatabase } from './db';
import { logAudit } from './audit';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export interface DatabaseSnapshot {
  version: string;
  timestamp: string;
  tables: Record<string, any[]>;
}

const ALL_TABLES = [
  'users',
  'categories',
  'items',
  'customers',
  'sales',
  'budgets',
  'production_orders',
  'inventory_movements',
  'receivables',
  'receiving_accounts',
  'cash_register_sessions',
  'online_services',
  'document_templates',
  'generated_documents',
  'opportunities',
  'opportunity_activities',
  'packages',
  'approach_templates',
  'segment_suggestions',
  'complementary_rules',
  'public_segment_pages',
  'company_settings',
  'audit_logs',
];

/**
 * Creates a structured JSON snapshot of all database tables
 */
export async function exportDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const snapshot: DatabaseSnapshot = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    tables: {},
  };

  for (const table of ALL_TABLES) {
    try {
      const rows = await db.all(`SELECT * FROM ${table}`);
      snapshot.tables[table] = rows;
    } catch (err) {
      console.warn(`Table ${table} not found or error reading:`, err);
      snapshot.tables[table] = [];
    }
  }

  return snapshot;
}

/**
 * Saves a local backup file on disk in ./data/backups/ (if filesystem is writable)
 */
export async function createLocalBackupFile(tag: string = 'manual'): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${tag}_${timestamp}.json`;

  try {
    ensureDirectories();
    const filePath = path.join(BACKUPS_DIR, filename);
    const snapshot = await exportDatabaseSnapshot();
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

    // Maintain max 20 backups
    try {
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
        .map((f) => ({ name: f, path: path.join(BACKUPS_DIR, f), time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 20) {
        for (const oldFile of files.slice(20)) {
          fs.unlinkSync(oldFile.path);
        }
      }
    } catch (err) {
      // Rotation fail is non-fatal
    }
  } catch (err) {
    console.warn('Could not write backup to disk (e.g. serverless read-only environment):', err);
  }

  return filename;
}

/**
 * Lists available local backups
 */
export function listLocalBackups(): Array<{ filename: string; size: number; createdAt: string }> {
  try {
    ensureDirectories();
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith('.json') || f.endsWith('.sqlite'))
      .map((f) => {
        const fullPath = path.join(BACKUPS_DIR, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return files;
  } catch (err) {
    return [];
  }
}

/**
 * Restores the database from a structured snapshot with pre-backup rollback protection
 */
export async function restoreDatabaseSnapshot(
  snapshot: DatabaseSnapshot,
  userId?: string,
  userName?: string
): Promise<{ success: boolean; error?: string; restoredTables: string[] }> {
  if (!snapshot || !snapshot.tables) {
    return { success: false, error: 'Formato de backup inválido.', restoredTables: [] };
  }

  // 1. Create safety backup of current state
  const safetyBackupName = await createLocalBackupFile('pre_restore');

  try {
    const restoredTables: string[] = [];
    const statements: Array<{ sql: string; args?: any[] } | string> = [];

    for (const table of ALL_TABLES) {
      const rows = snapshot.tables[table];
      if (Array.isArray(rows)) {
        statements.push(`DELETE FROM ${table};`);

        if (rows.length > 0) {
          const sample = rows[0];
          const columns = Object.keys(sample);
          const placeholders = columns.map(() => '?').join(', ');
          const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`;

          for (const row of rows) {
            const values = columns.map((col) => row[col]);
            statements.push({ sql, args: values });
          }
        }
        restoredTables.push(table);
      }
    }

    // Execute in atomic batch
    await db.batch(statements as any);
    persistDatabase();

    await logAudit({
      userId: userId || 'ADMIN',
      userName: userName || 'Administrador',
      action: 'RESTORE_DATABASE',
      entityType: 'DATABASE',
      entityId: 'ALL',
      details: {
        safetyBackupName,
        restoredTables,
        sourceTimestamp: snapshot.timestamp,
      },
    });

    return { success: true, restoredTables };
  } catch (err: any) {
    console.error('Database restore error:', err);
    return {
      success: false,
      error: `Falha ao restaurar banco de dados: ${err.message}.`,
      restoredTables: [],
    };
  }
}
