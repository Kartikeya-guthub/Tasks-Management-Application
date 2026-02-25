'use strict';

const { randomUUID } = require('crypto');

/**
 * Attaches a unique request ID to every inbound request.
 *
 * - Reuses X-Request-Id if already present (e.g. set by a load-balancer).
 * - Otherwise generates a fresh UUID v4.
 * - Sets X-Request-Id on the response so clients can correlate traces.
 * - Exposes req.requestId for use by loggers and error handlers.
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestId;
