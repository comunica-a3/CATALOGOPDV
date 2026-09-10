import express, { Request, Response } from 'express';
import { initializeDatabase, isTursoConfigured } from './db';
import { authMiddleware } from './auth';
import apiRoutes from './routes';

const app = express();

// Middleware for JSON & URL-encoded payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Auth Token Extraction Middleware
app.use(authMiddleware);

// Mount API routes on both /api and root to handle any Vercel rewrite variation
app.use('/api', apiRoutes);
app.use(apiRoutes);

let isDbReady = false;
let dbInitPromise: Promise<any> | null = null;

async function ensureDatabase() {
  if (isDbReady) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      if (isTursoConfigured()) {
        try {
          const db = await initializeDatabase();
          isDbReady = true;
          return db;
        } catch (err) {
          console.warn('Failed to initialize Turso in serverless, falling back to local SQLite:', err);
        }
      }
      const { initLocalSqlite } = await import('./db-local');
      const local = await initLocalSqlite();
      isDbReady = true;
      return local;
    })();
  }
  await dbInitPromise;
}

/**
 * Vercel Serverless Function Handler
 */
export default async function handler(req: Request, res: Response) {
  try {
    await ensureDatabase();
    return app(req, res);
  } catch (err: any) {
    console.error('Fatal Serverless API handler error:', err);
    res.status(500).json({
      error: 'Erro interno no servidor de banco de dados.',
      message: err?.message || 'Falha ao inicializar o banco online.',
    });
  }
}
