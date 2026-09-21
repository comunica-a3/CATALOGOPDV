import { createClient } from '@libsql/client';
import path from 'path';

const turso = createClient({
  url: process.env.TURSO_REMOTE_URL,
  authToken: process.env.TURSO_REMOTE_TOKEN,
});

const localDbPath = path.resolve('data/pdv_database.sqlite');
const local = createClient({
  url: `file:${localDbPath}`,
});

const TABLES = [
  'users', 'categories', 'items', 'customers', 'sales', 'budgets',
  'production_orders', 'inventory_movements', 'receivables', 'receiving_accounts',
  'cash_register_sessions', 'online_services', 'document_templates',
  'generated_documents', 'opportunities', 'opportunity_activities', 'packages',
  'approach_templates', 'segment_suggestions', 'complementary_rules',
  'public_segment_pages', 'company_settings', 'audit_logs', 'product_separations',
  'catalog_niches', 'schema_migrations'
];

async function executarResgate() {
  console.log('===> Conectando ao Turso e iniciando resgate dos dados...');

  for (const table of TABLES) {
    try {
      const res = await turso.execute(`SELECT * FROM ${table}`);
      const rows = res.rows;

      if (!rows || rows.length === 0) {
        console.log(`- Tabela ${table}: Vazia no Turso.`);
        continue;
      }

      console.log(`-> Migrando ${rows.length} registros da tabela "${table}"...`);

      for (const row of rows) {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders});`;
        const args = cols.map(c => row[c]);
        await local.execute({ sql, args });
      }
    } catch (err) {
      console.warn(`! Aviso na tabela "${table}":`, err.message);
    }
  }

  console.log('\n=====> SUCESSO! Todos os dados do Turso foram gravados no seu computador!');
}

executarResgate().catch(console.error);