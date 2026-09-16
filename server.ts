import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db';
import { authMiddleware } from './server/auth';
import apiRoutes from './server/routes';

async function startServer() {
  // Inicializa diretamente o banco de dados SQLite local
  console.log('Iniciando banco de dados SQLite local (data/pdv_database.sqlite)...');
  await initializeDatabase();
  console.log('Banco de dados local pronto.');

  const app = express();
  const PORT = 3000;

  // JSON Body Parser with ample limit for product images & snapshots
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Global Auth Token Extraction Middleware
  app.use(authMiddleware);

  // Mount API Endpoints FIRST
  app.use('/api', apiRoutes);

  // Serve static files from public directory (e.g. /catalogo.json)
  app.use(express.static(path.join(process.cwd(), 'public')));

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

