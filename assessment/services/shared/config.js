module.exports = {
  get LOG_LEVEL() {
    return process.env.LOG_LEVEL || 'info';
  },
  get DB_CONNECTION_LIMIT() {
    return parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10);
  },
  get API_ERROR_SAMPLING() {
    return parseFloat(process.env.API_ERROR_SAMPLING || '0.0');
  },
  get API_SIMULATED_LATENCY() {
    return parseInt(process.env.API_SIMULATED_LATENCY || '0', 10);
  },

  get HTTP_CLIENT_TIMEOUT() {
    return parseInt(process.env.HTTP_CLIENT_TIMEOUT || '2000', 10);
  },
  get HTTP_CLIENT_RETRIES() {
    return parseInt(process.env.HTTP_CLIENT_RETRIES || '0', 10);
  },
  get HTTP_CLIENT_RETRY_DELAY() {
    return parseInt(process.env.HTTP_CLIENT_RETRY_DELAY || '100', 10);
  },
  get HEALTH_DEEP_CHECK() {
    return process.env.HEALTH_DEEP_CHECK === 'true';
  },

  get USE_REDIS_CACHE() {
    return process.env.USE_REDIS_CACHE !== 'false';
  },
  get REDIS_TTL() {
    return parseInt(process.env.REDIS_TTL || '60', 10);
  }
};
