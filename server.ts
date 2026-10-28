import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db';
import { authMiddleware } from './server/auth';
import apiRoutes from './server/routes';
import { buildPublicCatalogPayload } from './server/catalogPublisher';
import { startBackupScheduler } from './server/backup';

async function startServer() {
  // Inicializa diretamente o banco de dados SQLite local
  console.log('Iniciando banco de dados SQLite local (data/pdv_database.sqlite)...');
  await initializeDatabase();
  console.log('Banco de dados local pronto.');

  // Inicia o agendador de backup automático diário
  startBackupScheduler();

  const app = express();
  const PORT = 3000;

  // CORS Middleware for API requests and preflight OPTIONS handling
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-session-token');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Dedicated Body Parser for Backup Import with controlled 200MB limit (accepts JSON and raw text)
  app.use('/api/backup/import', express.json({ limit: '200mb' }));
  app.use('/api/backup/import', express.text({ limit: '200mb', type: ['application/json', 'text/plain'] }));

  // General JSON Body Parser for all standard routes with controlled 15MB limit
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Global Auth Token Extraction Middleware
  app.use(authMiddleware);

  // Dynamic Catalog Data Endpoints (Always live and fresh from DB without browser cache)
  app.get(['/catalog/data', '/api/catalog/data', '/catalogo.json'], async (req, res) => {
    try {
      const payload = await buildPublicCatalogPayload();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao carregar dados do catálogo.' });
    }
  });

  // Mount API Endpoints
  app.use('/api', apiRoutes);

  // Centralized Error Handling Middleware for API Routes (Catches 413, SyntaxError, and 500s)
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[API Error on ${req.method} ${req.originalUrl || req.url}]:`, err);

    if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
      res.status(413).json({
        success: false,
        error: 'O arquivo enviado ultrapassa o limite de tamanho permitido pelo servidor (máx. 200 MB).',
        code: 'PAYLOAD_TOO_LARGE',
        maxLimitBytes: 200 * 1024 * 1024,
      });
      return;
    }

    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        success: false,
        error: 'Conteúdo JSON malformado ou corrompido.',
        code: 'INVALID_JSON',
      });
      return;
    }

    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Erro interno no servidor.',
      code: err.code || 'INTERNAL_ERROR',
    });
  });

  // Serve static files from public directory (e.g. /catalogo.json)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Configuração padrão para desativar cache em navegadores secundários
  const noCacheOptions = {
    etag: false,
    maxAge: 0,
    setHeaders: (res: any) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  };

  // Serve static files from public directory (e.g. /catalogo.json) sem cache
  app.use(express.static(path.join(process.cwd(), 'public'), noCacheOptions));

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve os arquivos compilados da dist desativando o cache HTTP
    app.use(express.static(distPath, noCacheOptions));
    app.get('*', (req, res) => {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sistema Gráfica PDV & ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});

