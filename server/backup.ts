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

export const ALL_TABLES = [
  'company_settings',
  'users',
  'categories',
  'items',
  'product_separations',
  'catalog_niches',
  'customers',
  'sales',
  'sale_annotations',
  'budgets',
  'production_orders',
  'inventory_movements',
  'receivables',
  'receiving_accounts',
  'financial_transfers',
  'cash_register_sessions',
  'account_balance_adjustments',
  'expenses',
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
  'uploaded_files',
  'audit_logs',
];

/**
 * Normalizes different incoming backup formats (native snapshot, direct tables, localStorage dump, camelCase)
 */
export function normalizeSnapshotPayload(input: any): DatabaseSnapshot | null {
  if (!input || typeof input !== 'object') return null;

  // Case 1: Standard snapshot format { version, timestamp, tables: { ... } }
  if (input.tables && typeof input.tables === 'object') {
    return {
      version: input.version || '2.0.0',
      timestamp: input.timestamp || new Date().toISOString(),
      tables: input.tables,
    };
  }

  // Case 2: Nested inside data or snapshot
  if (input.data?.tables && typeof input.data.tables === 'object') {
    return {
      version: input.data.version || input.version || '2.0.0',
      timestamp: input.data.timestamp || new Date().toISOString(),
      tables: input.data.tables,
    };
  }
  if (input.snapshot?.tables && typeof input.snapshot.tables === 'object') {
    return {
      version: input.snapshot.version || input.version || '2.0.0',
      timestamp: input.snapshot.timestamp || new Date().toISOString(),
      tables: input.snapshot.tables,
    };
  }

  // Case 3: Direct tables at root or localStorage dump keys (pdv_items, etc.)
  const tableAliasMap: Record<string, string> = {
    pdv_items: 'items',
    pdv_categories: 'categories',
    pdv_customers: 'customers',
    pdv_sales: 'sales',
    pdv_budgets: 'budgets',
    pdv_users: 'users',
    pdv_settings: 'company_settings',
    pdv_production: 'production_orders',
    pdv_inventory_movements: 'inventory_movements',
    pdv_receivables: 'receivables',
    pdv_receiving_accounts: 'receiving_accounts',
    pdv_expenses: 'expenses',
    pdv_opportunities: 'opportunities',
    pdv_opportunity_activities: 'opportunity_activities',
    pdv_packages: 'packages',
    pdv_approach_templates: 'approach_templates',
    pdv_segment_suggestions: 'segment_suggestions',
    pdv_complementary_rules: 'complementary_rules',
    pdv_public_segment_pages: 'public_segment_pages',
    pdv_catalog_niches: 'catalog_niches',
    pdv_product_separations: 'product_separations',
    pdv_document_templates: 'document_templates',
    pdv_generated_documents: 'generated_documents',
    pdv_cash_sessions: 'cash_register_sessions',
    pdv_financial_transfers: 'financial_transfers',
    pdv_sale_annotations: 'sale_annotations',
    productionOrders: 'production_orders',
    inventoryMovements: 'inventory_movements',
    receivingAccounts: 'receiving_accounts',
    cashRegisterSessions: 'cash_register_sessions',
    accountBalanceAdjustments: 'account_balance_adjustments',
    onlineServices: 'online_services',
    documentTemplates: 'document_templates',
    generatedDocuments: 'generated_documents',
    opportunityActivities: 'opportunity_activities',
    approachTemplates: 'approach_templates',
    segmentSuggestions: 'segment_suggestions',
    complementaryRules: 'complementary_rules',
    publicSegmentPages: 'public_segment_pages',
    companySettings: 'company_settings',
    settings: 'company_settings',
    auditLogs: 'audit_logs',
    productSeparations: 'product_separations',
    catalogNiches: 'catalog_niches',
    uploadedFiles: 'uploaded_files',
  };

  const tables: Record<string, any[]> = {};
  let recognizedCount = 0;

  for (const [key, val] of Object.entries(input)) {
    const canonical = tableAliasMap[key] || (ALL_TABLES.includes(key) ? key : null);
    if (canonical && val !== null && val !== undefined) {
      if (Array.isArray(val)) {
        tables[canonical] = val;
        recognizedCount += val.length;
      } else if (typeof val === 'object') {
        tables[canonical] = [val];
        recognizedCount += 1;
      }
    }
  }

  if (recognizedCount > 0 || Object.keys(tables).length > 0) {
    return {
      version: input.version || '2.0.0',
      timestamp: input.timestamp || new Date().toISOString(),
      tables,
    };
  }

  return null;
}

/**
 * Retrieves valid columns for a specific table directly from SQLite schema
 */
async function getTableColumns(tableName: string): Promise<Set<string>> {
  try {
    const cols = await db.all<{ name: string }>(`PRAGMA table_info("${tableName}")`);
    return new Set(cols.map((c) => c.name));
  } catch {
    return new Set();
  }
}

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
  rawSnapshot: any,
  userId?: string,
  userName?: string
): Promise<{ success: boolean; error?: string; restoredTables: string[]; totalRecordsRestored?: number }> {
  const snapshot = normalizeSnapshotPayload(rawSnapshot);
  if (!snapshot || !snapshot.tables || Object.keys(snapshot.tables).length === 0) {
    return {
      success: false,
      error: 'Formato de backup inválido ou nenhum dado reconhecido encontrado no arquivo selecionado.',
      restoredTables: [],
    };
  }

  // 1. Create safety backup of current state
  const safetyBackupName = await createLocalBackupFile('pre_restore');

  // Disable foreign keys during restore to avoid ordering deadlocks
  try {
    await db.run('PRAGMA foreign_keys = OFF;');
  } catch {}

  const restoredTables: string[] = [];
  let totalRecordsRestored = 0;

  try {
    // Start atomic transaction
    await db.run('BEGIN TRANSACTION;');

    for (const table of ALL_TABLES) {
      const rows = snapshot.tables[table];
      if (!Array.isArray(rows)) continue;

      const validColumns = await getTableColumns(table);
      if (validColumns.size === 0) continue;

      // Clear existing records in this table
      await db.run(`DELETE FROM "${table}";`);

      if (rows.length > 0) {
        const columnsToInsert = Array.from(validColumns);

        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;

          const presentCols: string[] = [];
          const values: any[] = [];

          for (const col of columnsToInsert) {
            let val: any = undefined;

            if (col in row) {
              val = row[col];
            } else {
              // Try camelCase counterpart (e.g. customer_name -> customerName)
              const camelKey = col.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
              if (camelKey in row) {
                val = row[camelKey];
              }
            }

            if (val !== undefined) {
              presentCols.push(col);
              if (val === null) {
                values.push(null);
              } else if (typeof val === 'boolean') {
                values.push(val ? 1 : 0);
              } else if (typeof val === 'object') {
                values.push(JSON.stringify(val));
              } else {
                values.push(val);
              }
            }
          }

          if (presentCols.length > 0) {
            const placeholders = presentCols.map(() => '?').join(', ');
            const sql = `INSERT INTO "${table}" (${presentCols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders});`;
            await db.run(sql, values);
            totalRecordsRestored++;
          }
        }
      }

      restoredTables.push(table);
    }

    // Safety check: ensure at least one active ADMIN exists in `users`
    try {
      const adminCount = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM users WHERE (role = 'ADMIN' OR role = 'ADMINISTRADOR') AND active = 1"
      );
      if (!adminCount || adminCount.count === 0) {
        console.warn('[Restore] Nenhum administrador ativo encontrado no snapshot. Inserindo administrador padrão de segurança.');
        const defaultAdminSql = `INSERT OR REPLACE INTO users (id, name, username, email, password_hash, role, active, must_change_password, is_test_user, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0, datetime('now'), datetime('now'))`;
        // Hash for initial password 'admin'
        await db.run(defaultAdminSql, [
          'usr-admin-1',
          'Administrador',
          'admin',
          'admin@digitalexpress.com.br',
          '$2b$10$cliTumfrlJVzQLn5khJ2OOCT9FT./IKOxqa.emBN/SnS.5R9VLyWe',
          'ADMIN',
        ]);
      }
    } catch (adminErr) {
      console.warn('Aviso ao verificar administrador pós-restauração:', adminErr);
    }

    // Commit atomic transaction
    await db.run('COMMIT;');
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
        totalRecordsRestored,
      },
    });

    return { success: true, restoredTables, totalRecordsRestored };
  } catch (err: any) {
    console.error('Database restore error:', err);
    try {
      await db.run('ROLLBACK;');
    } catch {}

    return {
      success: false,
      error: `Falha ao restaurar banco de dados: ${err.message}. A salvaguarda '${safetyBackupName}' foi preservada e o banco de dados não foi corrompido.`,
      restoredTables: [],
    };
  } finally {
    try {
      await db.run('PRAGMA foreign_keys = ON;');
    } catch {}
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;
let isSchedulerRunning = false;

/**
 * Returns the current backup status and scheduler info
 */
export function getBackupStatus(): {
  lastBackup: string | null;
  lastBackupDate: string | null;
  totalBackups: number;
  isAutoSchedulerRunning: boolean;
  nextScheduledEstimate?: string;
} {
  const backups = listLocalBackups();
  const last = backups[0];
  const lastDate = last ? last.createdAt : null;

  let nextEstimate: string | undefined = undefined;
  if (lastDate) {
    const nextTime = new Date(new Date(lastDate).getTime() + 24 * 60 * 60 * 1000);
    nextEstimate = nextTime.toISOString();
  }

  return {
    lastBackup: last ? last.filename : null,
    lastBackupDate: lastDate,
    totalBackups: backups.length,
    isAutoSchedulerRunning: isSchedulerRunning,
    nextScheduledEstimate: nextEstimate,
  };
}

/**
 * Starts the daily automated backup scheduler
 */
export function startBackupScheduler(): void {
  if (schedulerInterval) return;
  isSchedulerRunning = true;
  console.log('[Backup Scheduler] Agendador diário de backup ativado.');

  const checkAndRunAutoBackup = async () => {
    try {
      const backups = listLocalBackups();
      const autoBackups = backups.filter((b) => b.filename.includes('_auto_'));
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      let shouldRun = false;
      if (autoBackups.length === 0) {
        shouldRun = true;
      } else {
        const lastAutoTime = new Date(autoBackups[0].createdAt).getTime();
        if (now - lastAutoTime >= TWENTY_FOUR_HOURS) {
          shouldRun = true;
        }
      }

      if (shouldRun) {
        console.log('[Backup Scheduler] Executando backup automático diário...');
        const filename = await createLocalBackupFile('auto');
        console.log(`[Backup Scheduler] Backup automático criado com sucesso: ${filename}`);
      }
    } catch (err) {
      console.error('[Backup Scheduler] Erro ao executar verificação de backup automático:', err);
    }
  };

  // Run initial check after 5 seconds to ensure DB is initialized
  setTimeout(() => {
    checkAndRunAutoBackup();
  }, 5000);

  // Check every 1 hour
  schedulerInterval = setInterval(checkAndRunAutoBackup, 60 * 60 * 1000);
}

/**
 * Resolves safe local backup file path
 */
export function getBackupFilePath(filename: string): string | null {
  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
