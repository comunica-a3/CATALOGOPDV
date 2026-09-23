import { createClient, Client, InStatement } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import {
  INITIAL_CATEGORIES,
  INITIAL_COMPANY_SETTINGS,
  INITIAL_ITEMS,
  INITIAL_PRODUCT_SEPARATIONS,
  INITIAL_RECEIVING_ACCOUNTS,
} from '../src/data/initialData';
import {
  INITIAL_ONLINE_SERVICES,
} from '../src/data/initialServicesAndDocuments';
import {
  INITIAL_APPROACH_TEMPLATES,
  INITIAL_COMPLEMENTARY_RULES,
  INITIAL_OPPORTUNITIES,
  INITIAL_PACKAGES,
  INITIAL_PUBLIC_SEGMENT_PAGES,
  INITIAL_SEGMENT_SUGGESTIONS,
} from '../src/data/initialProspectingData';
import { INITIAL_CATALOG_NICHES } from '../src/data/initialCatalogNiches';
import { ensureDefaultAdminUser } from './auth';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const DB_FILE_PATH = path.join(DATA_DIR, 'pdv_database.sqlite');
export const DB_URL = `file:${DB_FILE_PATH}`;

let localClient: Client | null = null;

/**
 * Garante que os diretórios locais de dados, backups e uploads existam
 */
export function ensureDirectories(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    // Ignorado em caso de permissão de leitura
  }
}

/**
 * Persistência automática do SQLite local via @libsql/client
 */
export function persistDatabase(): void {
  // Com o @libsql/client em modo arquivo local (file:data/pdv_database.sqlite),
  // as alterações são gravadas diretamente no disco em tempo real de forma ACID.
}

export function queueDatabaseSave(): void {
  persistDatabase();
}

/**
 * Database wrapper interface supporting async operations via local SQLite (@libsql/client)
 */
export interface DbWrapper {
  get isTurso(): boolean;
  get isLocal(): boolean;
  get raw(): any;
  get turso(): Client | null;
  get client(): Client | null;
  run(sqlText: string, params?: any[]): Promise<void>;
  exec(sqlText: string): Promise<any[]>;
  all<T = any>(sqlText: string, params?: any[]): Promise<T[]>;
  get<T = any>(sqlText: string, params?: any[]): Promise<T | null>;
  batch(statements: InStatement[]): Promise<any[]>;
}

export const db: DbWrapper = {
  get isTurso(): boolean {
    return false;
  },

  get isLocal(): boolean {
    return true;
  },

  get raw(): any {
    return localClient;
  },

  get turso(): Client | null {
    return null;
  },

  get client(): Client | null {
    return localClient;
  },

  async run(sqlText: string, params: any[] = []): Promise<void> {
    if (!localClient) {
      throw new Error('Banco de dados local não inicializado.');
    }
    await localClient.execute({ sql: sqlText, args: params });
  },

  async exec(sqlText: string): Promise<any[]> {
    if (!localClient) {
      throw new Error('Banco de dados local não inicializado.');
    }
    await localClient.executeMultiple(sqlText);
    return [];
  },

  async all<T = any>(sqlText: string, params: any[] = []): Promise<T[]> {
    if (!localClient) {
      throw new Error('Banco de dados local não inicializado.');
    }
    const rs = await localClient.execute({ sql: sqlText, args: params });
    return rs.rows as unknown as T[];
  },

  async get<T = any>(sqlText: string, params: any[] = []): Promise<T | null> {
    if (!localClient) {
      throw new Error('Banco de dados local não inicializado.');
    }
    const rs = await localClient.execute({ sql: sqlText, args: params });
    return rs.rows.length > 0 ? (rs.rows[0] as unknown as T) : null;
  },

  async batch(statements: InStatement[]): Promise<any[]> {
    if (!localClient) {
      throw new Error('Banco de dados local não inicializado.');
    }
    return await localClient.batch(statements);
  },
};

/**
 * Migration Runner: applies versioned database migrations
 */
export async function runMigrations(): Promise<void> {
  // Ensure schema_migrations table exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await db.all<{ version: string }>('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // Migration 001: Core System Schema
  if (!appliedVersions.has('001_initial_core_schema')) {
    console.log('Applying migration 001_initial_core_schema...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        must_change_password INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id TEXT PRIMARY KEY,
        settings_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        description TEXT,
        item_type TEXT,
        icon TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migrate categories table columns if missing
    try { await db.run('ALTER TABLE categories ADD COLUMN item_type TEXT;'); } catch {}
    try { await db.run('ALTER TABLE categories ADD COLUMN icon TEXT;'); } catch {}

    await db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trade_name TEXT,
        type TEXT DEFAULT 'PF',
        cpf_cnpj TEXT,
        rg_ie TEXT,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        address TEXT,
        number TEXT,
        complement TEXT,
        neighborhood TEXT,
        city TEXT,
        state TEXT,
        cep TEXT,
        notes TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        barcode TEXT,
        category_id TEXT,
        type TEXT NOT NULL,
        description TEXT,
        cost_price REAL DEFAULT 0,
        supplier_cost REAL DEFAULT 0,
        supplier_freight REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        margin_reais REAL DEFAULT 0,
        margin_percent REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 0,
        unit TEXT DEFAULT 'UN',
        image_url TEXT,
        show_in_catalog INTEGER DEFAULT 1,
        featured_in_catalog INTEGER DEFAULT 0,
        pricing_model TEXT,
        production_type TEXT,
        lead_time TEXT,
        requires_file INTEGER DEFAULT 0,
        brand TEXT,
        supplier TEXT,
        price_rules_json TEXT,
        packages_json TEXT,
        area_pricing_json TEXT,
        variants_json TEXT,
        estimated_time TEXT,
        service_fields_json TEXT,
        service_url TEXT,
        image_source TEXT DEFAULT 'upload',
        image_original_url TEXT,
        google_media_id TEXT,
        google_drive_file_id TEXT,
        google_drive_file_name TEXT,
        google_drive_mime_type TEXT,
        google_drive_thumbnail_url TEXT,
        google_drive_account TEXT,
        image_metadata_json TEXT,
        options_json TEXT,
        data_json TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migrate items table columns if missing in existing databases
    try { await db.run('ALTER TABLE items ADD COLUMN barcode TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN supplier_cost REAL DEFAULT 0;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN supplier_freight REAL DEFAULT 0;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN brand TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN supplier TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN pricing_model TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN production_type TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN lead_time TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN requires_file INTEGER DEFAULT 0;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN packages_json TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN area_pricing_json TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN variants_json TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN estimated_time TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN service_fields_json TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN service_url TEXT;'); } catch {}
    try { await db.run("ALTER TABLE items ADD COLUMN image_source TEXT DEFAULT 'upload';"); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN image_original_url TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_media_id TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_file_id TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_file_name TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_mime_type TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_thumbnail_url TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_account TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN image_metadata_json TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN options_json TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN data_json TEXT;'); } catch {}

    await db.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        sale_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        seller_id TEXT,
        seller_name TEXT,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        addition REAL DEFAULT 0,
        total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        payment_status TEXT NOT NULL,
        payment_method TEXT,
        payments_json TEXT,
        items_json TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'CONCLUIDA',
        is_deleted INTEGER DEFAULT 0,
        deleted_at TEXT,
        deleted_by TEXT,
        deleted_by_name TEXT,
        deletion_reason TEXT,
        edit_history_json TEXT,
        invoice_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        budget_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        seller_id TEXT,
        seller_name TEXT,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        addition REAL DEFAULT 0,
        total REAL DEFAULT 0,
        status TEXT NOT NULL,
        valid_until TEXT,
        items_json TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS production_orders (
        id TEXT PRIMARY KEY,
        order_number INTEGER,
        sale_id TEXT,
        sale_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        item_id TEXT,
        item_name TEXT,
        quantity REAL DEFAULT 1,
        status TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIA',
        dead_line TEXT,
        notes TEXT,
        files_json TEXT,
        stages_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        previous_stock REAL NOT NULL,
        current_stock REAL NOT NULL,
        reason TEXT,
        user_id TEXT,
        user_name TEXT,
        reference_id TEXT,
        reference_type TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS receivables (
        id TEXT PRIMARY KEY,
        sale_id TEXT,
        sale_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        due_date TEXT,
        status TEXT NOT NULL,
        payment_records_json TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS receiving_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        receiver_name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        pix_key TEXT,
        bank_details TEXT,
        card_fee_percent REAL DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS financial_transfers (
        id TEXT PRIMARY KEY,
        transfer_number TEXT NOT NULL,
        from_account_id TEXT NOT NULL,
        from_account_name TEXT NOT NULL,
        to_account_id TEXT NOT NULL,
        to_account_name TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        observation TEXT,
        user_id TEXT,
        user_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS cash_register_sessions (
        id TEXT PRIMARY KEY,
        register_number TEXT,
        opened_by_user_id TEXT NOT NULL,
        opened_by_user_name TEXT NOT NULL,
        closed_by_user_id TEXT,
        closed_by_user_name TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        initial_amount REAL DEFAULT 0,
        final_cash_amount REAL,
        status TEXT NOT NULL,
        notes TEXT,
        closing_notes TEXT,
        summary_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS account_balance_adjustments (
        id TEXT PRIMARY KEY,
        adjustment_number TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        previous_balance REAL DEFAULT 0,
        new_balance REAL DEFAULT 0,
        adjusted_amount REAL DEFAULT 0,
        reason TEXT,
        user_id TEXT,
        user_name TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS sale_annotations (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        text TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_sale_annotations_sale_id ON sale_annotations(sale_id);
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS online_services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL DEFAULT 0,
        turnaround_time TEXT,
        requirements TEXT,
        description TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        variables_json TEXT,
        active INTEGER DEFAULT 1,
        default_price REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migrate document_templates table columns if missing
    try { await db.run('ALTER TABLE document_templates ADD COLUMN default_price REAL DEFAULT 0;'); } catch {}

    await db.run(`
      CREATE TABLE IF NOT EXISTS generated_documents (
        id TEXT PRIMARY KEY,
        template_id TEXT,
        template_name TEXT NOT NULL,
        title TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_cpf_cnpj TEXT,
        rendered_content TEXT NOT NULL,
        created_by_user_id TEXT,
        created_by_user_name TEXT,
        price_charged REAL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);

    // Migrate generated_documents table columns if missing
    try { await db.run('ALTER TABLE generated_documents ADD COLUMN price_charged REAL DEFAULT 0;'); } catch {}

    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['001_initial_core_schema', 'Initial Core ERP & PDV Tables', new Date().toISOString()]
    );
  }

  // Migration 002: Prospecting, Packages & Audit Tables
  if (!appliedVersions.has('002_prospecting_and_audit')) {
    console.log('Applying migration 002_prospecting_and_audit...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY,
        opportunity_number INTEGER,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        segment TEXT NOT NULL,
        stage TEXT NOT NULL,
        estimated_value REAL DEFAULT 0,
        confidence INTEGER DEFAULT 50,
        neighborhood TEXT,
        city TEXT,
        origin TEXT,
        origin_details TEXT,
        notes TEXT,
        assigned_seller_id TEXT,
        assigned_seller_name TEXT,
        next_action_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS opportunity_activities (
        id TEXT PRIMARY KEY,
        opportunity_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        user_id TEXT,
        user_name TEXT,
        date TEXT NOT NULL,
        scheduled_for TEXT,
        completed INTEGER DEFAULT 1,
        result TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        segment TEXT NOT NULL,
        target_audience TEXT,
        description TEXT,
        items_json TEXT NOT NULL,
        total_individual_price REAL DEFAULT 0,
        package_price REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        pitch TEXT,
        featured INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS approach_templates (
        id TEXT PRIMARY KEY,
        segment TEXT NOT NULL,
        title TEXT NOT NULL,
        trigger TEXT NOT NULL,
        message_text TEXT NOT NULL,
        tone TEXT NOT NULL,
        variables_json TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS segment_suggestions (
        id TEXT PRIMARY KEY,
        segment TEXT NOT NULL,
        label TEXT NOT NULL,
        suggested_product_ids_json TEXT,
        suggested_package_ids_json TEXT,
        tips_json TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS complementary_rules (
        id TEXT PRIMARY KEY,
        trigger_item_id TEXT,
        trigger_item_name TEXT,
        suggested_item_ids_json TEXT,
        reason TEXT,
        discount_on_combo REAL DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS public_segment_pages (
        id TEXT PRIMARY KEY,
        segment_slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        cover_image_url TEXT,
        hero_badge TEXT,
        pain_points_json TEXT,
        solutions_json TEXT,
        recommended_package_ids_json TEXT,
        testimonials_json TEXT,
        cta_text TEXT,
        whatsapp_default_message TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details_json TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['002_prospecting_and_audit', 'Prospecting, Commercial Packages & Audit Logs', new Date().toISOString()]
    );
  }

  // Migration 003: Performance Indexes
  if (!appliedVersions.has('003_indexes_and_optimizations')) {
    console.log('Applying migration 003_indexes_and_optimizations...');
    await db.run(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_seller ON opportunities(assigned_seller_id);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);`);

    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['003_indexes_and_optimizations', 'Indexes for Search & Queries', new Date().toISOString()]
    );
  }

  // Migration 005: Guarantee all columns in items and categories
  if (!appliedVersions.has('005_ensure_items_categories_columns')) {
    console.log('Applying migration 005_ensure_items_categories_columns...');
    await ensureAllTableColumns();
    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['005_ensure_items_categories_columns', 'Ensure all required columns exist in items and categories', new Date().toISOString()]
    );
  }

  // Migration 006: Ensure service_url column in items table
  if (!appliedVersions.has('006_service_url_column')) {
    console.log('Applying migration 006_service_url_column...');
    try { await db.run('ALTER TABLE items ADD COLUMN service_url TEXT;'); } catch {}
    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['006_service_url_column', 'Add service_url column to items table', new Date().toISOString()]
    );
  }

  // Migration 007: Add image_source, image_original_url, google_media_id, image_metadata_json to items table
  if (!appliedVersions.has('007_image_source_and_google_photos')) {
    console.log('Applying migration 007_image_source_and_google_photos...');
    try { await db.run("ALTER TABLE items ADD COLUMN image_source TEXT DEFAULT 'upload';"); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN image_original_url TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_media_id TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN image_metadata_json TEXT;'); } catch {}
    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['007_image_source_and_google_photos', 'Add image_source, image_original_url, google_media_id, image_metadata_json to items', new Date().toISOString()]
    );
  }

  // Migration 008: Google Drive Image Integration (zero-storage reference fields)
  if (!appliedVersions.has('008_google_drive_image_integration')) {
    console.log('Applying migration 008_google_drive_image_integration...');
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_file_id TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_file_name TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_mime_type TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_thumbnail_url TEXT;'); } catch {}
    try { await db.run('ALTER TABLE items ADD COLUMN google_drive_account TEXT;'); } catch {}
    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['008_google_drive_image_integration', 'Add Google Drive metadata fields to items table', new Date().toISOString()]
    );
  }

  // Migration 009: Product Separations (Dynamic Categories / Separações de Produtos)
  if (!appliedVersions.has('009_product_separations_table')) {
    console.log('Applying migration 009_product_separations_table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_separations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        is_system INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Ensure the 3 standard system separations exist
    for (const s of INITIAL_PRODUCT_SEPARATIONS) {
      await db.run(
        `INSERT OR IGNORE INTO product_separations (id, name, description, icon, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        [s.id, s.name, s.description || '', s.icon || null, s.sortOrder || 0, new Date().toISOString(), new Date().toISOString()]
      );
    }

    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['009_product_separations_table', 'Add product_separations table for dynamic product categories', new Date().toISOString()]
    );
  }

  // Migration 010: Ensure packages table exists
  if (!appliedVersions.has('010_ensure_packages_table')) {
    console.log('Applying migration 010_ensure_packages_table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        segment TEXT NOT NULL,
        target_audience TEXT,
        description TEXT,
        items_json TEXT NOT NULL,
        total_individual_price REAL DEFAULT 0,
        package_price REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        pitch TEXT,
        featured INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.run(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
      ['010_ensure_packages_table', 'Ensure commercial packages table exists', new Date().toISOString()]
    );
  }

  // Always run unconditional column check to heal any existing database schema drift
  await ensureAllTableColumns();
}

/**
 * Unconditionally guarantees all required columns exist in tables across all SQLite/Turso instances.
 */
export async function ensureAllTableColumns(): Promise<void> {
  // Directly attempt to add service_url and image columns if missing
  try {
    await db.run('ALTER TABLE items ADD COLUMN service_url TEXT;');
  } catch {}
  try {
    await db.run("ALTER TABLE items ADD COLUMN image_source TEXT DEFAULT 'upload';");
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN image_original_url TEXT;');
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN google_media_id TEXT;');
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN google_drive_file_id TEXT;');
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN google_drive_file_name TEXT;');
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN google_drive_mime_type TEXT;');
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN google_drive_thumbnail_url TEXT;');
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN google_drive_account TEXT;');
  } catch {}
  try {
    await db.run('ALTER TABLE items ADD COLUMN image_metadata_json TEXT;');
  } catch {}

  const tableColumns: { table: string; columns: { name: string; type: string }[] }[] = [
    {
      table: 'categories',
      columns: [
        { name: 'slug', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'item_type', type: 'TEXT' },
        { name: 'icon', type: 'TEXT' },
        { name: 'active', type: 'INTEGER DEFAULT 1' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },
    {
      table: 'items',
      columns: [
        { name: 'sku', type: 'TEXT' },
        { name: 'barcode', type: 'TEXT' },
        { name: 'category_id', type: 'TEXT' },
        { name: 'type', type: "TEXT DEFAULT 'PRODUTO_FISICO'" },
        { name: 'description', type: 'TEXT' },
        { name: 'cost_price', type: 'REAL DEFAULT 0' },
        { name: 'supplier_cost', type: 'REAL DEFAULT 0' },
        { name: 'supplier_freight', type: 'REAL DEFAULT 0' },
        { name: 'sale_price', type: 'REAL DEFAULT 0' },
        { name: 'margin_reais', type: 'REAL DEFAULT 0' },
        { name: 'margin_percent', type: 'REAL DEFAULT 0' },
        { name: 'stock', type: 'REAL DEFAULT 0' },
        { name: 'min_stock', type: 'REAL DEFAULT 0' },
        { name: 'unit', type: "TEXT DEFAULT 'UN'" },
        { name: 'image_url', type: 'TEXT' },
        { name: 'image_source', type: "TEXT DEFAULT 'upload'" },
        { name: 'image_original_url', type: 'TEXT' },
        { name: 'google_media_id', type: 'TEXT' },
        { name: 'image_metadata_json', type: 'TEXT' },
        { name: 'show_in_catalog', type: 'INTEGER DEFAULT 1' },
        { name: 'featured_in_catalog', type: 'INTEGER DEFAULT 0' },
        { name: 'pricing_model', type: 'TEXT' },
        { name: 'production_type', type: 'TEXT' },
        { name: 'lead_time', type: 'TEXT' },
        { name: 'requires_file', type: 'INTEGER DEFAULT 0' },
        { name: 'brand', type: 'TEXT' },
        { name: 'supplier', type: 'TEXT' },
        { name: 'price_rules_json', type: 'TEXT' },
        { name: 'packages_json', type: 'TEXT' },
        { name: 'area_pricing_json', type: 'TEXT' },
        { name: 'variants_json', type: 'TEXT' },
        { name: 'estimated_time', type: 'TEXT' },
        { name: 'service_fields_json', type: 'TEXT' },
        { name: 'service_url', type: 'TEXT' },
        { name: 'options_json', type: 'TEXT' },
        { name: 'data_json', type: 'TEXT' },
        { name: 'active', type: 'INTEGER DEFAULT 1' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },
    {
      table: 'customers',
      columns: [
        { name: 'trade_name', type: 'TEXT' },
        { name: 'type', type: "TEXT DEFAULT 'PF'" },
        { name: 'cpf_cnpj', type: 'TEXT' },
        { name: 'rg_ie', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'whatsapp', type: 'TEXT' },
        { name: 'email', type: 'TEXT' },
        { name: 'address', type: 'TEXT' },
        { name: 'number', type: 'TEXT' },
        { name: 'complement', type: 'TEXT' },
        { name: 'neighborhood', type: 'TEXT' },
        { name: 'city', type: 'TEXT' },
        { name: 'state', type: 'TEXT' },
        { name: 'cep', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'active', type: 'INTEGER DEFAULT 1' },
      ],
    },
    {
      table: 'receiving_accounts',
      columns: [
        { name: 'initial_balance', type: 'REAL DEFAULT 0' },
        { name: 'credit_fee_percent', type: 'REAL DEFAULT 0' },
        { name: 'debit_fee_percent', type: 'REAL DEFAULT 0' },
        { name: 'notes', type: 'TEXT' },
      ],
    },
    {
      table: 'cash_register_sessions',
      columns: [
        { name: 'closing_notes', type: 'TEXT' },
        { name: 'summary_json', type: 'TEXT' },
        { name: 'final_cash_amount', type: 'REAL' },
      ],
    },
    {
      table: 'sales',
      columns: [
        { name: 'notes', type: 'TEXT' },
        { name: 'sale_code', type: 'TEXT' },
        { name: 'status', type: "TEXT DEFAULT 'CONCLUIDA'" },
        { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'deleted_by_name', type: 'TEXT' },
        { name: 'deletion_reason', type: 'TEXT' },
        { name: 'edit_history_json', type: 'TEXT' },
      ],
    },
    {
      table: 'users',
      columns: [
        { name: 'is_test_user', type: 'INTEGER DEFAULT 0' },
      ],
    },
    {
      table: 'production_orders',
      columns: [
        { name: 'order_number', type: 'TEXT' },
        { name: 'sale_number', type: 'TEXT' },
        { name: 'sale_item_id', type: 'TEXT' },
        { name: 'customer_phone', type: 'TEXT' },
        { name: 'seller_id', type: 'TEXT' },
        { name: 'seller_name', type: 'TEXT' },
        { name: 'promoter_id', type: 'TEXT' },
        { name: 'promoter_name', type: 'TEXT' },
        { name: 'production_type', type: 'TEXT' },
        { name: 'lead_time', type: 'TEXT' },
        { name: 'configuration_json', type: 'TEXT' },
        { name: 'completed_at', type: 'TEXT' },
      ],
    },
  ];

  for (const tc of tableColumns) {
    for (const col of tc.columns) {
      try {
        await db.run(`ALTER TABLE ${tc.table} ADD COLUMN ${col.name} ${col.type};`);
      } catch {
        // Ignored if column already exists
      }
    }
  }

  // Ensure supplementary finance and sales tables exist even if migrations already ran
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS account_balance_adjustments (
        id TEXT PRIMARY KEY,
        adjustment_number TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        previous_balance REAL DEFAULT 0,
        new_balance REAL DEFAULT 0,
        adjusted_amount REAL DEFAULT 0,
        reason TEXT,
        user_id TEXT,
        user_name TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS sale_annotations (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        text TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_sale_annotations_sale_id ON sale_annotations(sale_id);
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        data_base64 TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_filename ON uploaded_files(filename);
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS catalog_niches (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        cta_text TEXT,
        badge TEXT,
        image_url TEXT,
        item_type_match TEXT,
        category_match_keywords_json TEXT,
        custom_keywords_json TEXT,
        active INTEGER DEFAULT 1,
        niche_order INTEGER DEFAULT 1,
        data_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_catalog_niches_order ON catalog_niches(niche_order);
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        segment TEXT NOT NULL,
        target_audience TEXT,
        description TEXT,
        items_json TEXT NOT NULL,
        total_individual_price REAL DEFAULT 0,
        package_price REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        pitch TEXT,
        featured INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  } catch {}
}

/**
 * Seed initial official catalog, rules, and settings if tables are empty
 */
export async function seedDefaultDataIfEmpty(): Promise<void> {
  // 1. Settings
  const settingsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM company_settings');
  if (!settingsCount || settingsCount.count === 0) {
    await db.run(
      'INSERT INTO company_settings (id, settings_json, updated_at) VALUES (?, ?, ?)',
      ['default', JSON.stringify(INITIAL_COMPANY_SETTINGS), new Date().toISOString()]
    );
  }

  // 2. Categories
  const catCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if (!catCount || catCount.count === 0) {
    for (const cat of INITIAL_CATEGORIES) {
      await db.run(
        'INSERT OR REPLACE INTO categories (id, name, slug, description, item_type, icon, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [cat.id, cat.name, (cat as any).slug || '', (cat as any).description || '', (cat as any).itemType || null, (cat as any).icon || null, 1, new Date().toISOString(), new Date().toISOString()]
      );
    }
  }

  // 2b. Product Separations
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_separations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        is_system INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    const sepCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM product_separations');
    if (!sepCount || sepCount.count === 0) {
      for (const s of INITIAL_PRODUCT_SEPARATIONS) {
        await db.run(
          `INSERT OR IGNORE INTO product_separations (id, name, description, icon, is_system, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
          [s.id, s.name, s.description || '', s.icon || null, s.sortOrder || 0, new Date().toISOString(), new Date().toISOString()]
        );
      }
    }
  } catch (err) {
    console.warn('Notice seeding product_separations:', err);
  }

  // 3. Official Catalog Items - seeded once on fresh installation
  const isCatalogSeeded = await db.get<{ version: string }>(
    'SELECT version FROM schema_migrations WHERE version = ?',
    ['004_initial_catalog_seeded']
  );
  if (!isCatalogSeeded) {
    const itemsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM items');
    if (!itemsCount || itemsCount.count === 0) {
      for (const item of INITIAL_ITEMS) {
        const cleanImg = item.imageUrl && !item.imageUrl.includes('unsplash.com') ? item.imageUrl : '';
        await db.run(
          `INSERT OR REPLACE INTO items (
            id, name, sku, barcode, category_id, type, description, cost_price, supplier_cost, supplier_freight,
            sale_price, margin_reais, margin_percent, stock, min_stock, unit, image_url, show_in_catalog, featured_in_catalog,
            pricing_model, production_type, lead_time, requires_file, brand, supplier, price_rules_json, packages_json,
            area_pricing_json, variants_json, estimated_time, service_fields_json, options_json, data_json, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.name,
            item.sku || '',
            item.barcode || null,
            item.categoryId,
            item.type,
            item.description || '',
            item.costPrice || 0,
            item.supplierCost || 0,
            item.supplierFreight || 0,
            item.salePrice || 0,
            item.marginReais || 0,
            item.marginPercent || 0,
            item.stock || 0,
            item.minStock || 0,
            (item as any).unit || 'UN',
            cleanImg,
            item.showInCatalog ? 1 : 0,
            item.featuredInCatalog ? 1 : 0,
            item.pricingModel || null,
            item.productionType || null,
            item.leadTime || null,
            item.requiresFile ? 1 : 0,
            item.brand || null,
            item.supplier || null,
            item.priceRules ? JSON.stringify(item.priceRules) : null,
            item.packages ? JSON.stringify(item.packages) : null,
            item.areaPricing ? JSON.stringify(item.areaPricing) : null,
            item.variants ? JSON.stringify(item.variants) : null,
            (item as any).estimatedTime || null,
            (item as any).serviceFields ? JSON.stringify((item as any).serviceFields) : null,
            (item as any).options ? JSON.stringify((item as any).options) : null,
            JSON.stringify(item),
            item.active !== false ? 1 : 0,
            item.createdAt || '2026-01-01T00:00:00.000Z',
            item.updatedAt || '2026-01-01T00:00:00.000Z',
          ]
        );
      }
    }
    await db.run('INSERT OR IGNORE INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)', [
      '004_initial_catalog_seeded',
      'Initial Official Catalog Seeded',
      new Date().toISOString(),
    ]);
  }

  // 4. Receiving Accounts
  const accCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM receiving_accounts');
  if (!accCount || accCount.count === 0) {
    for (const acc of INITIAL_RECEIVING_ACCOUNTS as any[]) {
      await db.run(
        `INSERT OR REPLACE INTO receiving_accounts (
          id, name, type, receiver_name, active, pix_key, bank_details, card_fee_percent, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          acc.id,
          acc.name,
          acc.type,
          acc.receiverName,
          acc.active ? 1 : 0,
          acc.pixKey || '',
          acc.bankDetails || '',
          acc.creditFeePercent || acc.cardFeePercent || 0,
          acc.isDefault ? 1 : 0,
          acc.createdAt || new Date().toISOString(),
          acc.updatedAt || new Date().toISOString(),
        ]
      );
    }
  }

  // 5. Online Services & Document Templates
  const hasExistingData = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM items');
  if (!hasExistingData || hasExistingData.count === 0) {
    const svcCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM online_services');
    if (!svcCount || svcCount.count === 0) {
      for (const svc of INITIAL_ONLINE_SERVICES as any[]) {
        await db.run(
          `INSERT OR REPLACE INTO online_services (
            id, name, category, price, turnaround_time, requirements, description, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            svc.id,
            svc.name,
            svc.category,
            svc.price || 0,
            svc.turnaroundTime || '',
            svc.requirements || '',
            svc.description || '',
            svc.active ? 1 : 0,
            svc.createdAt || new Date().toISOString(),
            svc.updatedAt || new Date().toISOString(),
          ]
        );
      }
    }
  }

  // Ensure all legacy fictitious/example document templates are permanently purged
  try {
    await db.run(`DELETE FROM document_templates WHERE id IN (
      'tmpl-curriculo-profissional',
      'tmpl-contrato-prestacao-servicos',
      'tmpl-declaracao-residencia',
      'tmpl-procuracao-simples',
      'tmpl-recibo-simples',
      'tmpl-requerimento-administrativo',
      'tmpl-carta-demissao'
    )`);
  } catch {}

  // 6. Commercial Packages & Approach Templates
  const pkgCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM packages');
  if (!pkgCount || pkgCount.count === 0) {
    for (const pkg of INITIAL_PACKAGES as any[]) {
      await db.run(
        `INSERT OR REPLACE INTO packages (
          id, name, segment, target_audience, description, items_json, total_individual_price, package_price, discount_percent, pitch, featured, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pkg.id,
          pkg.name,
          pkg.targetSegment || pkg.segment || 'Geral',
          pkg.targetSegment || '',
          pkg.description || '',
          JSON.stringify(pkg.items),
          pkg.originalTotal || 0,
          pkg.packagePrice || 0,
          pkg.discountPercent || 0,
          pkg.description || '',
          pkg.featuredInPublic ? 1 : 0,
          pkg.active !== false ? 1 : 0,
          pkg.createdAt || new Date().toISOString(),
          pkg.updatedAt || new Date().toISOString(),
        ]
      );
    }
  }

  const appCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM approach_templates');
  if (!appCount || appCount.count === 0) {
    for (const ap of INITIAL_APPROACH_TEMPLATES as any[]) {
      await db.run(
        `INSERT OR REPLACE INTO approach_templates (
          id, segment, title, trigger, message_text, tone, variables_json, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ap.id,
          ap.category || 'Geral',
          ap.title,
          ap.targetStage || 'ALL',
          ap.templateText || '',
          'Profissional',
          null,
          ap.active !== false ? 1 : 0,
          ap.createdAt || new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    }
  }

  // 7. Complementary rules & Public segment pages
  const ruleCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM complementary_rules');
  if (!ruleCount || ruleCount.count === 0) {
    for (const rule of INITIAL_COMPLEMENTARY_RULES as any[]) {
      await db.run(
        `INSERT OR REPLACE INTO complementary_rules (
          id, trigger_item_id, trigger_item_name, suggested_item_ids_json, reason, discount_on_combo, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rule.id,
          rule.baseItemId || rule.triggerItemId || '',
          rule.baseItemName || rule.triggerItemName || '',
          JSON.stringify(rule.suggestedItemIds || []),
          rule.notes || rule.reason || '',
          0,
          1,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    }
  }

  const pubCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM public_segment_pages');
  if (!pubCount || pubCount.count === 0) {
    for (const pg of INITIAL_PUBLIC_SEGMENT_PAGES as any[]) {
      await db.run(
        `INSERT OR REPLACE INTO public_segment_pages (
          id, segment_slug, title, subtitle, cover_image_url, hero_badge, pain_points_json, solutions_json, recommended_package_ids_json, testimonials_json, cta_text, whatsapp_default_message, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pg.id,
          pg.slug || pg.segmentSlug || '',
          pg.title || '',
          pg.headline || '',
          pg.imageUrl || '',
          pg.badgeText || '',
          JSON.stringify(pg.suggestedProductIds || []),
          JSON.stringify(pg.suggestedPackageIds || []),
          JSON.stringify(pg.suggestedPackageIds || []),
          null,
          'Solicitar Orçamento',
          '',
          pg.active !== false ? 1 : 0,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    }
  }

  // 9. Catalog Niches
  const nichesCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM catalog_niches');
  if (!nichesCount || nichesCount.count === 0) {
    for (const niche of INITIAL_CATALOG_NICHES) {
      await db.run(
        `INSERT OR REPLACE INTO catalog_niches (
          id, title, description, cta_text, badge, image_url, item_type_match,
          category_match_keywords_json, custom_keywords_json, active, niche_order,
          data_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          niche.id,
          niche.title,
          niche.description || '',
          niche.ctaText || null,
          niche.badge || null,
          niche.imageUrl || null,
          niche.itemTypeMatch || null,
          niche.categoryMatchKeywords ? JSON.stringify(niche.categoryMatchKeywords) : null,
          niche.customKeywords ? JSON.stringify(niche.customKeywords) : null,
          niche.active !== false ? 1 : 0,
          Number(niche.order ?? 1),
          JSON.stringify(niche),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    }
  }

  // Captação Ativa: Limpeza de quaisquer leads/oportunidades demonstrativas legadas
  // Não cria leads automáticos - a captação deve iniciar vazia se não houver leads reais
  await db.run(`DELETE FROM opportunities WHERE id IN ('opp-1', 'opp-2', 'opp-3', 'opp-4') OR id LIKE 'opp-demo%'`);
  await db.run(`DELETE FROM opportunity_activities WHERE opportunity_id IN ('opp-1', 'opp-2', 'opp-3', 'opp-4') OR opportunity_id LIKE 'opp-demo%'`);

  // 9. Ensure Initial Administrator exists (admin / admin, must_change_password = 1)
  await ensureDefaultAdminUser();
}

/**
 * Hard resets and reseeds the entire database to the factory initial seed state
 */
export async function resetDatabaseToSeed(userId?: string, userName?: string): Promise<{ success: boolean; message: string }> {
  // 1. Wipe transactional and dynamic tables safely
  const candidateTables = [
    'sales',
    'budgets',
    'production_orders',
    'inventory_movements',
    'receivables',
    'financial_transfers',
    'cash_register_sessions',
    'customers',
    'generated_documents',
    'opportunity_activities',
    'opportunities',
    'audit_logs',
    'items',
    'categories',
    'product_separations',
    'company_settings',
    'receiving_accounts',
    'online_services',
    'document_templates',
    'packages',
    'approach_templates',
    'segment_suggestions',
    'complementary_rules',
    'public_segment_pages',
    'catalog_niches',
  ];

  try {
    const existingTableRows = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const existingTableSet = new Set(existingTableRows.map((r) => r.name));

    for (const tbl of candidateTables) {
      if (existingTableSet.has(tbl)) {
        await db.run(`DELETE FROM ${tbl}`);
      }
    }
  } catch (err) {
    for (const tbl of candidateTables) {
      try {
        await db.run(`DELETE FROM ${tbl}`);
      } catch (e) {
        // Table might not exist yet
      }
    }
  }

  // 2. Insert factory seed data

  // Settings
  await db.run(
    'INSERT INTO company_settings (id, settings_json, updated_at) VALUES (?, ?, ?)',
    ['default', JSON.stringify(INITIAL_COMPANY_SETTINGS), '2026-01-01T00:00:00.000Z']
  );

  // Categories
  for (const cat of INITIAL_CATEGORIES) {
    await db.run(
      'INSERT OR REPLACE INTO categories (id, name, slug, description, item_type, icon, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cat.id, cat.name, (cat as any).slug || '', (cat as any).description || '', (cat as any).itemType || null, (cat as any).icon || null, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']
    );
  }

  // Product Separations
  for (const s of INITIAL_PRODUCT_SEPARATIONS) {
    await db.run(
      'INSERT OR REPLACE INTO product_separations (id, name, description, icon, is_system, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [s.id, s.name, s.description || '', s.icon || null, s.sortOrder || 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']
    );
  }

  // Items
  for (const item of INITIAL_ITEMS) {
    const cleanImg = item.imageUrl && !item.imageUrl.includes('unsplash.com') ? item.imageUrl : '';
    await db.run(
      `INSERT OR REPLACE INTO items (
        id, name, sku, barcode, category_id, type, description, cost_price, supplier_cost, supplier_freight,
        sale_price, margin_reais, margin_percent, stock, min_stock, unit, image_url, show_in_catalog, featured_in_catalog,
        pricing_model, production_type, lead_time, requires_file, brand, supplier, price_rules_json, packages_json,
        area_pricing_json, variants_json, estimated_time, service_fields_json, options_json, data_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.sku || '',
        item.barcode || null,
        item.categoryId,
        item.type,
        item.description || '',
        item.costPrice || 0,
        item.supplierCost || 0,
        item.supplierFreight || 0,
        item.salePrice || 0,
        item.marginReais || 0,
        item.marginPercent || 0,
        item.stock || 0,
        item.minStock || 0,
        (item as any).unit || 'UN',
        cleanImg,
        item.showInCatalog ? 1 : 0,
        item.featuredInCatalog ? 1 : 0,
        item.pricingModel || null,
        item.productionType || null,
        item.leadTime || null,
        item.requiresFile ? 1 : 0,
        item.brand || null,
        item.supplier || null,
        item.priceRules ? JSON.stringify(item.priceRules) : null,
        item.packages ? JSON.stringify(item.packages) : null,
        item.areaPricing ? JSON.stringify(item.areaPricing) : null,
        item.variants ? JSON.stringify(item.variants) : null,
        (item as any).estimatedTime || null,
        (item as any).serviceFields ? JSON.stringify((item as any).serviceFields) : null,
        (item as any).options ? JSON.stringify((item as any).options) : null,
        JSON.stringify(item),
        item.active !== false ? 1 : 0,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Receiving Accounts
  for (const acc of INITIAL_RECEIVING_ACCOUNTS as any[]) {
    await db.run(
      `INSERT OR REPLACE INTO receiving_accounts (
        id, name, type, receiver_name, active, pix_key, bank_details, card_fee_percent, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        acc.id,
        acc.name,
        acc.type,
        acc.receiverName,
        acc.active ? 1 : 0,
        acc.pixKey || '',
        acc.bankDetails || '',
        acc.creditFeePercent || acc.cardFeePercent || 0,
        acc.isDefault ? 1 : 0,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Online Services
  for (const svc of INITIAL_ONLINE_SERVICES as any[]) {
    await db.run(
      `INSERT OR REPLACE INTO online_services (
        id, name, category, price, turnaround_time, requirements, description, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        svc.id,
        svc.name,
        svc.category,
        svc.price || 0,
        svc.turnaroundTime || '',
        svc.requirements || '',
        svc.description || '',
        svc.active ? 1 : 0,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Document Templates: cleared for production use (zero pre-loaded templates)
  await db.run('DELETE FROM document_templates');

  // Packages
  for (const pkg of INITIAL_PACKAGES as any[]) {
    await db.run(
      `INSERT OR REPLACE INTO packages (
        id, name, segment, target_audience, description, items_json, total_individual_price, package_price, discount_percent, pitch, featured, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pkg.id,
        pkg.name,
        pkg.targetSegment || pkg.segment || 'Geral',
        pkg.targetSegment || '',
        pkg.description || '',
        JSON.stringify(pkg.items),
        pkg.originalTotal || 0,
        pkg.packagePrice || 0,
        pkg.discountPercent || 0,
        pkg.description || '',
        pkg.featuredInPublic ? 1 : 0,
        pkg.active !== false ? 1 : 0,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Approach templates
  for (const ap of INITIAL_APPROACH_TEMPLATES as any[]) {
    await db.run(
      `INSERT OR REPLACE INTO approach_templates (
        id, segment, title, trigger, message_text, tone, variables_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ap.id,
        ap.category || 'Geral',
        ap.title,
        ap.targetStage || 'ALL',
        ap.templateText || '',
        'Profissional',
        null,
        ap.active !== false ? 1 : 0,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Complementary rules
  for (const rule of INITIAL_COMPLEMENTARY_RULES as any[]) {
    await db.run(
      `INSERT OR REPLACE INTO complementary_rules (
        id, trigger_item_id, trigger_item_name, suggested_item_ids_json, reason, discount_on_combo, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id,
        rule.baseItemId || rule.triggerItemId || '',
        rule.baseItemName || rule.triggerItemName || '',
        JSON.stringify(rule.suggestedItemIds || []),
        rule.notes || rule.reason || '',
        0,
        1,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Public segment pages
  for (const pg of INITIAL_PUBLIC_SEGMENT_PAGES as any[]) {
    await db.run(
      `INSERT OR REPLACE INTO public_segment_pages (
        id, segment_slug, title, subtitle, cover_image_url, hero_badge, pain_points_json, solutions_json, recommended_package_ids_json, testimonials_json, cta_text, whatsapp_default_message, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pg.id,
        pg.slug || pg.segmentSlug || '',
        pg.title || '',
        pg.headline || '',
        pg.imageUrl || '',
        pg.badgeText || '',
        JSON.stringify(pg.suggestedProductIds || []),
        JSON.stringify(pg.suggestedPackageIds || []),
        JSON.stringify(pg.suggestedPackageIds || []),
        null,
        'Solicitar Orçamento',
        '',
        pg.active !== false ? 1 : 0,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Catalog Niches
  for (const niche of INITIAL_CATALOG_NICHES) {
    await db.run(
      `INSERT OR REPLACE INTO catalog_niches (
        id, title, description, cta_text, badge, image_url, item_type_match,
        category_match_keywords_json, custom_keywords_json, active, niche_order,
        data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        niche.id,
        niche.title,
        niche.description || '',
        niche.ctaText || null,
        niche.badge || null,
        niche.imageUrl || null,
        niche.itemTypeMatch || null,
        niche.categoryMatchKeywords ? JSON.stringify(niche.categoryMatchKeywords) : null,
        niche.customKeywords ? JSON.stringify(niche.customKeywords) : null,
        niche.active !== false ? 1 : 0,
        Number(niche.order ?? 1),
        JSON.stringify(niche),
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ]
    );
  }

  // Captação Ativa: sem criação de leads automáticos
  await db.run(`DELETE FROM opportunities WHERE id IN ('opp-1', 'opp-2', 'opp-3', 'opp-4') OR id LIKE 'opp-demo%'`);

  await ensureDefaultAdminUser();

  return { success: true, message: 'Banco de dados restaurado para os dados padrão com sucesso.' };
}

/**
 * Inicializa o banco de dados diretamente em arquivo SQLite local (data/pdv_database.sqlite) via @libsql/client
 */
export async function initializeDatabase(): Promise<Client> {
  ensureDirectories();

  console.log(`Conectando ao banco de dados SQLite local: ${DB_URL}`);

  localClient = createClient({
    url: DB_URL,
  });

  try {
    // Executar migrações de esquema
    await runMigrations();

    // Se o banco estiver vazio, inicializar com dados padrão
    await seedDefaultDataIfEmpty();

    console.log(`Banco de dados SQLite local pronto em: ${DB_FILE_PATH}`);
    return localClient;
  } catch (err) {
    localClient = null;
    console.error('Erro ao inicializar banco de dados SQLite local:', err);
    throw err;
  }
}
