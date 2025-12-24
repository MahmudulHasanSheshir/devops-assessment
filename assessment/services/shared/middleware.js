const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const config = require('./config');

const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};

const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration_ms = Date.now() - start;
    logger.info('request_completed', {
      path: req.path,
      method: req.method,
      status: res.statusCode,
      duration_ms,
      correlation_id: req.correlationId
    });
  });

  next();
};

const simulationMiddleware = async (req, res, next) => {
    if (req.path === '/health' || req.path === '/ready') {
        return next();
    }

    const delay = config.API_SIMULATED_LATENCY;
    if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    const failRate = config.API_ERROR_SAMPLING;
    if (failRate > 0 && Math.random() < failRate) {
        logger.error('simulated_failure', { correlation_id: req.correlationId, path: req.path });
        return res.status(500).json({ error: 'Simulated infrastructure failure' });
    }

    next();
};

module.exports = {
  correlationIdMiddleware,
  requestLoggerMiddleware,
  simulationMiddleware
};
