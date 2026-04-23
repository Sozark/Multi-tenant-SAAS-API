import express from 'express';
import { env } from './config/env';
import { apiRouter } from './api';
import { errorHandler } from './middleware/error';
import logger from 'pino-http';

const app = express();

app.use(express.json());
app.use(logger({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' }));

app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/v1', apiRouter);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});