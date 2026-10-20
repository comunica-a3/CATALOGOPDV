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

export interface ColumnMeta {
  name: string;
  type: string;
  notnull: boolean;
  dflt_value: string | null;
  pk: boolean;
}

/**
 * Normalizes different incoming backup formats (native snapshot, direct tables, localStorage dump, camelCase)
 */
export function normalizeSnapshotPayload(rawInput: any): DatabaseSnapshot | null {
  if (!rawInput) return null;

  let input = rawInput;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return null;
    }
  }

  if (!input || typeof input !== 'object') return null;

  // Extract source tables container
  let rawTables: Record<string, any> = {};
  if (input.tables && typeof input.tables === 'object' && !Array.isArray(input.tables)) {
    rawTables = input.tables;
  } else if (input.data?.tables && typeof input.data.tables === 'object' && !Array.isArray(input.data.tables)) {
    rawTables = input.data.tables;
  } else if (input.snapshot?.tables && typeof input.snapshot.tables === 'object' && !Array.isArray(input.snapshot.tables)) {
    rawTables = input.snapshot.tables;
  } else {
    // Direct root properties or localStorage dump
    rawTables = input;
  }

  const tableAliasMap: Record<string, string> = {
    pdv_items: 'items',
    pdv_categories: 'categories',
    pdv_customers: 'customers',
    pdv_sales: 'sales',
    pdv_budgets: 'budgets',
    pdv_users: 'users',
    pdv_settings: 'company_settings',
    pdv_company_settings: 'company_settings',
    pdv_production: 'production_orders',
    pdv_production_orders: 'production_orders',
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
    pdv_cash_register_sessions: 'cash_register_sessions',
    pdv_financial_transfers: 'financial_transfers',
    pdv_sale_annotations: 'sale_annotations',
    pdv_uploaded_files: 'uploaded_files',
    pdv_account_balance_adjustments: 'account_balance_adjustments',
    pdv_online_services: 'online_services',
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
    financialTransfers: 'financial_transfers',
    saleAnnotations: 'sale_annotations',
  };

  const tables: Record<string, any[]> = {};
  let recognizedCount = 0;

  for (const [key, val] of Object.entries(rawTables)) {
    if (val === null || val === undefined) continue;
    // Map alias or direct snake_case or convert camelCase to snake_case
    const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    const canonical =
      tableAliasMap[key] ||
      (ALL_TABLES.includes(key) ? key : null) ||
      tableAliasMap[snakeCaseKey] ||
      (ALL_TABLES.includes(snakeCaseKey) ? snakeCaseKey : null);

    if (canonical) {
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
 * Retrieves valid columns with schema metadata for a specific table directly from SQLite schema
 */
async function getTableColumns(tableName: string): Promise<Map<string, ColumnMeta>> {
  try {
    const cols = await db.all<{ name: string; type: string; notnull: number; dflt_value: string | null; pk: number }>(
      `PRAGMA table_info("${tableName}")`
    );
    const map = new Map<string, ColumnMeta>();
    for (const c of cols) {
      map.set(c.name, {
        name: c.name,
        type: (c.type || 'TEXT').toUpperCase(),
        notnull: c.notnull === 1,
        dflt_value: c.dflt_value,
        pk: c.pk > 0,
      });
    }
    return map;
  } catch {
    return new Map();
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
  let inTransaction = false;

  try {
    // Start atomic transaction
    await db.run('BEGIN TRANSACTION;');
    inTransaction = true;

    const now = new Date().toISOString();

    for (const table of ALL_TABLES) {
      const rows = snapshot.tables[table];
      if (!Array.isArray(rows)) continue;

      const colMap = await getTableColumns(table);
      if (colMap.size === 0) continue;

      // Clear existing records in this table
      await db.run(`DELETE FROM "${table}";`);

      if (rows.length > 0) {
        for (const rawRow of rows) {
          if (!rawRow || typeof rawRow !== 'object') continue;

          let row = { ...rawRow };

          // Bridge table-specific schemas and legacy JSON structures
          if (table === 'company_settings') {
            if (row.settings_json === undefined) {
              const settingsPayload = { ...row };
              delete (settingsPayload as any).id;
              delete (settingsPayload as any).updated_at;
              delete (settingsPayload as any).updatedAt;
              row = {
                id: row.id || 'default',
                settings_json: JSON.stringify(settingsPayload),
                updated_at: row.updatedAt || row.updated_at || now,
              };
            }
          } else if (table === 'sales') {
            if (row.items_json === undefined) {
              row.items_json = row.items !== undefined ? (typeof row.items === 'string' ? row.items : JSON.stringify(row.items)) : '[]';
            }
            if (row.payments_json === undefined && row.payments !== undefined) {
              row.payments_json = typeof row.payments === 'string' ? row.payments : JSON.stringify(row.payments);
            }
            if (row.edit_history_json === undefined && row.editHistory !== undefined) {
              row.edit_history_json = typeof row.editHistory === 'string' ? row.editHistory : JSON.stringify(row.editHistory);
            }
            if (row.payment_status === undefined) {
              row.payment_status = row.paymentStatus || 'PENDENTE';
            }
            if (row.status === undefined) {
              row.status = row.status || 'CONCLUIDA';
            }
          } else if (table === 'budgets') {
            if (row.items_json === undefined) {
              row.items_json = row.items !== undefined ? (typeof row.items === 'string' ? row.items : JSON.stringify(row.items)) : '[]';
            }
            if (row.status === undefined) {
              row.status = row.status || 'PENDENTE';
            }
          } else if (table === 'production_orders') {
            if (row.files_json === undefined && row.files !== undefined) {
              row.files_json = typeof row.files === 'string' ? row.files : JSON.stringify(row.files);
            }
            if (row.stages_json === undefined && row.stages !== undefined) {
              row.stages_json = typeof row.stages === 'string' ? row.stages : JSON.stringify(row.stages);
            }
            if (row.status === undefined) {
              row.status = row.status || 'PENDENTE';
            }
          } else if (table === 'packages') {
            if (row.items_json === undefined) {
              row.items_json = row.items !== undefined ? (typeof row.items === 'string' ? row.items : JSON.stringify(row.items)) : '[]';
            }
            if (!row.name) row.name = 'Pacote';
            if (!row.segment) row.segment = row.targetSegment || 'Geral';
          } else if (table === 'uploaded_files') {
            if (row.mime_type === undefined) row.mime_type = row.mimeType || 'application/octet-stream';
            if (row.data_base64 === undefined) row.data_base64 = row.dataBase64 || row.base64 || '';
            if (row.filename === undefined) row.filename = row.fileName || 'file';
          } else if (table === 'cash_register_sessions') {
            if (row.summary_json === undefined && row.summary !== undefined) {
              row.summary_json = typeof row.summary === 'string' ? row.summary : JSON.stringify(row.summary);
            }
            if (row.opened_by_user_id === undefined) row.opened_by_user_id = row.openedByUserId || 'usr-admin-1';
            if (row.opened_by_user_name === undefined) row.opened_by_user_name = row.openedByUserName || 'Administrador';
            if (row.opened_at === undefined) row.opened_at = row.openedAt || now;
            if (row.status === undefined) row.status = 'FECHADO';
          }

          const presentCols: string[] = [];
          const values: any[] = [];

          for (const [colName, meta] of colMap.entries()) {
            let val: any = undefined;

            if (colName in row) {
              val = row[colName];
            } else {
              // Try camelCase counterpart (e.g. customer_name -> customerName)
              const camelKey = colName.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
              if (camelKey in row) {
                val = row[camelKey];
              }
            }

            // Fallback for primary key if missing or null
            if ((val === undefined || val === null) && meta.pk) {
              if (table === 'company_settings') {
                val = 'default';
              } else if (colName === 'id') {
                val = `${table}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
              }
            }

            // Fallback for NOT NULL constraint on missing or null values
            if ((val === undefined || val === null) && meta.notnull && meta.dflt_value === null && !meta.pk) {
              if (colName === 'created_at') {
                val = row.createdAt || row.updatedAt || now;
              } else if (colName === 'updated_at') {
                val = row.updatedAt || row.createdAt || now;
              } else if (colName.endsWith('_json')) {
                val = '[]';
              } else if (meta.type.includes('INT') || meta.type.includes('REAL') || meta.type.includes('NUM')) {
                val = 0;
              } else {
                val = '';
              }
            }

            if (val !== undefined) {
              presentCols.push(colName);
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
            const sql = `INSERT OR REPLACE INTO "${table}" (${presentCols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders});`;
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
    inTransaction = false;
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
    if (inTransaction) {
      try {
        await db.run('ROLLBACK;');
      } catch (rbErr) {
        console.warn('Rollback notice:', rbErr);
      }
    }

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
