/**
 * dump-turso.js
 * Script para resgatar e fazer backup completo de todos os dados do Turso Cloud
 * antes de desligá-lo, salvando em data/turso_dump.json e inserindo no banco local SQLite (data/pdv_database.sqlite).
 */

import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'pdv_database.sqlite');
const DUMP_JSON_PATH = path.join(DATA_DIR, 'turso_dump.json');

async function main() {
  console.log('====================================================');
  console.log('  RESGATE E BACKUP DE DADOS DO TURSO CLOUD');
  console.log('====================================================');

  if (!TURSO_URL) {
    console.error('ERRO: Variável TURSO_DATABASE_URL não configurada.');
    process.exit(1);
  }

  console.log(`Conectando ao Turso: ${TURSO_URL}`);
  const turso = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  // Garantir diretórios
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  // 1. Obter todas as tabelas
  const tablesRes = await turso.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%'"
  );

  const tables = tablesRes.rows;
  console.log(`Encontradas ${tables.length} tabelas no Turso:`);
  console.log(tables.map((t) => t.name).join(', '));
  console.log('----------------------------------------------------');

  const dumpData = {
    exportedAt: new Date().toISOString(),
    tursoUrl: TURSO_URL,
    tables: {},
  };

  // 2. Extrair dados de cada tabela
  for (const tableRow of tables) {
    const tableName = String(tableRow.name);
    process.stdout.write(`Exportando ${tableName}... `);

    try {
      let query = `SELECT * FROM ${tableName}`;
      if (tableName === 'audit_logs') {
        // Limitar logs de auditoria recentes para evitar download excessivo
        query = `SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 5000`;
      }

      const rowsRes = await turso.execute(query);
      const rows = rowsRes.rows;
      dumpData.tables[tableName] = {
        schema: tableRow.sql,
        count: rows.length,
        rows: rows,
      };
      console.log(`[OK] (${rows.length} registros)`);
    } catch (err) {
      console.log(`[ERRO]: ${err.message}`);
      dumpData.tables[tableName] = {
        schema: tableRow.sql,
        count: 0,
        rows: [],
        error: err.message,
      };
    }
  }

  // 3. Salvar JSON de dump
  fs.writeFileSync(DUMP_JSON_PATH, JSON.stringify(dumpData, null, 2), 'utf-8');
  console.log('----------------------------------------------------');
  console.log(`Dump salvo com sucesso em: ${DUMP_JSON_PATH}`);

  // Fazer cópia com timestamp em backups
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUPS_DIR, `turso_dump_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(dumpData, null, 2), 'utf-8');
  console.log(`Cópia de segurança arquivada em: ${backupPath}`);

  // 4. Migrar diretamente para o banco de dados local SQLite
  console.log('----------------------------------------------------');
  console.log(`Migrando registros para o banco SQLite local: ${LOCAL_DB_PATH}`);

  const localDb = createClient({
    url: `file:${LOCAL_DB_PATH}`,
  });

  // Criar tabelas e transferir dados
  for (const tableRow of tables) {
    const tableName = String(tableRow.name);
    const tableSql = String(tableRow.sql);
    const tableInfo = dumpData.tables[tableName];

    if (!tableInfo || !tableInfo.rows) continue;

    try {
      // Criar tabela se não existir
      await localDb.execute(tableSql);

      const rows = tableInfo.rows;
      if (rows.length > 0) {
        process.stdout.write(`Inserindo ${rows.length} linhas em ${tableName} local... `);
        // Inserir em lotes de 100
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const slice = rows.slice(i, i + batchSize);
          const stmts = [];
          for (const row of slice) {
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            const sql = `INSERT OR REPLACE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`;
            const args = cols.map((c) => row[c]);
            stmts.push({ sql, args });
          }
          await localDb.batch(stmts);
        }
        console.log('[OK]');
      }
    } catch (err) {
      console.log(`[AVISO na migração local de ${tableName}]: ${err.message}`);
    }
  }

  console.log('====================================================');
  console.log('  RESGATE E MIGRAÇÃO TURSO -> LOCAL CONCLUÍDOS!');
  console.log(`  Banco local pronto em: ${LOCAL_DB_PATH}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Erro fatal no script dump-turso:', err);
  process.exit(1);
});
