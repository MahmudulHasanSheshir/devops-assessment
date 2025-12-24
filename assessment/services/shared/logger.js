const { v4: uuidv4 } = require('uuid');

const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';

function log(level, message, meta = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    ...meta
  }));
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
