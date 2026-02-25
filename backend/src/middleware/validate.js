'use strict';

const { validationResult } = require('express-validator');

/**
 * Express middleware that runs after express-validator chains.
 * Returns 422 with error details if any validation failed.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
}

module.exports = validate;
