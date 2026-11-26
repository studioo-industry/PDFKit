import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { setupAuthRoutes } from './server/auth';
import { setupShareRoutes } from './server/share';

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '150mb' }));
  app.use(express.urlencoded({ limit: '150mb', extended: true }));

  // Custom error handler for JSON parsing / payload too large
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): any => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        error: 'File size exceeds server upload limit for sharing (Max: 100MB).',
      });
    }
    next(err);
  });

  // Setup authentication and share endpoints
  setupAuthRoutes(app);
  setupShareRoutes(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'PDFKit', mode: '100% Free & Unlimited' });
  });

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
    console.log(`PDFKit server running on port ${PORT}`);
  });
}

startServer();
