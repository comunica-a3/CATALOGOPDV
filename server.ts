import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase, isTursoConfigured } from './server/db';
import { authMiddleware } from './server/auth';
import apiRoutes from './server/routes';

async function startServer() {
  // Initialize central database with migrations & seed data
  let dbInitialized = false;
  if (isTursoConfigured()) {
    try {
      console.log('Connecting to Turso Cloud Database...');
      await initializeDatabase();
      console.log('Turso Cloud Database ready.');
      dbInitialized = true;
    } catch (tursoErr) {
      console.warn('Could not initialize Turso Cloud Database, falling back to local SQLite:', tursoErr);
    }
  }

  if (!dbInitialized) {
    console.log('Initializing local SQLite database (sql.js)...');
    const { initLocalSqlite } = await import('./server/db-local');
    await initLocalSqlite();
    console.log('Local SQLite database ready.');
  }

  const app = express();
  const PORT = 3000;

  // JSON Body Parser with ample limit for product images & snapshots
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Global Auth Token Extraction Middleware
  app.use(authMiddleware);

  // Mount API Endpoints FIRST
  app.use('/api', apiRoutes);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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

