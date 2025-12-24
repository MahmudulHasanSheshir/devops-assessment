const express = require('express');
const axios = require('axios');
const { logger, db, middleware, config } = require('shared');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3002;
const SERVICE_NAME = 'order-service';
process.env.SERVICE_NAME = SERVICE_NAME;

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3000';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';

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

async function fetchWithRetry(url, context) {
  const timeout = config.HTTP_CLIENT_TIMEOUT;
  const retries = config.HTTP_CLIENT_RETRIES;
  const backoff = config.HTTP_CLIENT_RETRY_DELAY;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const httpRequestConfig = {
        timeout,
        headers: {
          'x-correlation-id': context.correlationId
        }
      };
      const response = await axios.get(url, httpRequestConfig);
      return response.data;
    } catch (err) {
      lastError = err;
      logger.warn(`Downstream call failed attempt ${attempt + 1}/${retries + 1}`, {
        url,
        error: err.message,
        correlation_id: context.correlationId
      });
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, backoff * (attempt + 1))); 
      }
    }
  }
  throw lastError;
}

app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    
    if (config.HEALTH_DEEP_CHECK) {
      await axios.get(`${USER_SERVICE_URL}/health`, { timeout: 1000 });
      await axios.get(`${PRODUCT_SERVICE_URL}/health`, { timeout: 1000 });
    }

    res.json({ status: 'ready' });
  } catch (err) {
    logger.error('Readiness check failed', { error: err.message });
    res.status(503).json({ status: 'not ready' });
  }
});

app.post('/orders', async (req, res) => {
  const { userId, productId, qty } = req.body;
  const context = { correlationId: req.correlationId };

  if (!userId || !productId || !qty) {
    return res.status(400).json({ error: 'Missing userId, productId, or qty' });
  }

  try {
    const user = await fetchWithRetry(`${USER_SERVICE_URL}/users/${userId}`, context);
    const product = await fetchWithRetry(`${PRODUCT_SERVICE_URL}/products/${productId}`, context);

    const query = `
      INSERT INTO orders (user_id, product_id, qty, status, created_at)
      VALUES ($1, $2, $3, 'CONFIRMED', NOW())
      RETURNING id, status
    `;
    const result = await db.query(query, [user.id, product.id, qty]);
    
    res.status(201).json({
      orderId: result.rows[0].id,
      status: result.rows[0].status,
      totalPrice: product.price * qty
    });

  } catch (err) {
    logger.error('Order creation failed', { error: err.message, correlation_id: req.correlationId });
    
    if (axios.isAxiosError(err)) {
        if (err.response) {
             return res.status(err.response.status).json({ error: 'Downstream service error', details: err.response.data });
        } else if (err.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Downstream timeout' });
        }
        return res.status(502).json({ error: 'Downstream unreachable' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  logger.info(`Service ${SERVICE_NAME} listening on port ${PORT}`);
});
