import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { setLocalDbEngine, runMigrations, seedDefaultDataIfEmpty, LocalDbEngine } from './db';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'pdv_database.sqlite');

let dbInstance: Database | null = null;
let saveDebounceTimer: NodeJS.Timeout | null = null;

export function ensureLocalDirectories(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  } catch (err) {
    // Non-fatal
  }
}

export function persistLocalDatabase(): void {
  if (!dbInstance) return;
  try {
    ensureLocalDirectories();
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.warn('Failed to persist local SQLite database:', err);
  }
}

export function queueLocalDatabaseSave(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    persistLocalDatabase();
    saveDebounceTimer = null;
  }, 100);
}

/**
 * Initializes the local SQLite database using sql.js for offline dev
 */
export async function initLocalSqlite(): Promise<Database> {
  ensureLocalDirectories();
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      console.log(`Loaded existing local SQLite database from ${DB_FILE} (${fileBuffer.length} bytes)`);
    } catch (err) {
      console.error('Error loading existing local SQLite database, creating new one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    console.log('Creating fresh local SQLite database...');
    dbInstance = new SQL.Database();
  }

  // Register local engine with db wrapper
  const engine: LocalDbEngine = {
    get raw() {
      return dbInstance;
    },
    run(sqlText: string, params: any[] = []) {
      if (!dbInstance) throw new Error('Local SQLite database not initialized');
      dbInstance.run(sqlText, params);
      queueLocalDatabaseSave();
    },
    exec(sqlText: string) {
      if (!dbInstance) throw new Error('Local SQLite database not initialized');
      const res = dbInstance.exec(sqlText);
      queueLocalDatabaseSave();
      return res;
    },
    all<T = any>(sqlText: string, params: any[] = []): T[] {
      if (!dbInstance) throw new Error('Local SQLite database not initialized');
      const stmt = dbInstance.prepare(sqlText);
      stmt.bind(params);
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      stmt.free();
      return results;
    },
    get<T = any>(sqlText: string, params: any[] = []): T | null {
      const results = engine.all<T>(sqlText, params);
      return results.length > 0 ? results[0] : null;
    },
    batch(statements: any[]): any[] {
      if (!dbInstance) throw new Error('Local SQLite database not initialized');
      const results: any[] = [];
      dbInstance.run('BEGIN TRANSACTION;');
      try {
        for (const stmt of statements) {
          if (typeof stmt === 'string') {
            dbInstance.run(stmt);
          } else {
            dbInstance.run(stmt.sql, stmt.args as any[]);
          }
        }
        dbInstance.run('COMMIT;');
        queueLocalDatabaseSave();
      } catch (err) {
        dbInstance.run('ROLLBACK;');
        throw err;
      }
      return results;
    },
    persist() {
      persistLocalDatabase();
    },
  };

  setLocalDbEngine(engine);

  // Run migrations & seed for local database
  await runMigrations();
  await seedDefaultDataIfEmpty();

  // Save state after migrations & seed
  persistLocalDatabase();

  return dbInstance;
}
