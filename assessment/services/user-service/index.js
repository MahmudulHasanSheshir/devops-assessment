const express = require('express');
const { logger, db, middleware } = require('shared');
const app = express();

const PORT = process.env.PORT || 3000;
const SERVICE_NAME = 'user-service';
process.env.SERVICE_NAME = SERVICE_NAME;

app.use(express.json());
app.use(middleware.correlationIdMiddleware);
app.use(middleware.requestLoggerMiddleware);
app.use(middleware.simulationMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (err) {
    logger.error('Readiness check failed', { error: err.message });
    res.status(503).json({ status: 'not ready' });
  }
});

app.get('/version', (req, res) => {
  res.json({ version: '1.0.0', build: process.env.BUILD_VERSION || 'local' });
});

app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Database error', { error: err.message, correlation_id: req.correlationId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ labels: { service: SERVICE_NAME } });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

app.listen(PORT, () => {
  logger.info(`Service ${SERVICE_NAME} listening on port ${PORT}`);
});
