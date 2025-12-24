const express = require('express');
const { logger, db, middleware, config } = require('shared');
const client = require('prom-client');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_NAME = 'product-service';
process.env.SERVICE_NAME = SERVICE_NAME;

let redisClient;
if (config.USE_REDIS_CACHE) {
    redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => logger.error('Redis Client Error', { error: err.message }));
    redisClient.connect().then(() => logger.info('Redis connected')).catch(err => logger.error('Redis connection failed', { error: err.message }));
}

app.use(express.json());
app.use(middleware.correlationIdMiddleware);
app.use(middleware.requestLoggerMiddleware);
app.use(middleware.simulationMiddleware);

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ labels: { service: SERVICE_NAME } });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/version', (req, res) => {
  res.json({ version: '1.0.0', build: process.env.BUILD_VERSION || 'local' });
});

app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    if (redisClient && !redisClient.isOpen) {
        throw new Error('Redis not connected');
    }
    res.json({ status: 'ready' });
  } catch (err) {
    logger.error('Readiness check failed', { error: err.message });
    res.status(503).json({ status: 'not ready' });
  }
});

app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product:${id}`;

  try {
    if (config.USE_REDIS_CACHE && redisClient && redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
    }

    const result = await db.query('SELECT id, name, price FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = result.rows[0];

    if (config.USE_REDIS_CACHE && redisClient && redisClient.isOpen) {
        await redisClient.set(cacheKey, JSON.stringify(product), {
            EX: config.REDIS_TTL
        });
    }

    res.json(product);
  } catch (err) {
    logger.error('Database error', { error: err.message, correlation_id: req.correlationId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  logger.info(`Service ${SERVICE_NAME} listening on port ${PORT}`);
});
