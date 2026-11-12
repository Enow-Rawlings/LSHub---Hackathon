/**
 * Thin wrapper around AuditLog creation.
 * Keeps audit writes consistent and easy to call from route handlers.
 */
const AuditLog = require('../models/AuditLog');

/**
 * Write an audit log entry. Never throws - audit failures should not break the main flow.
 */
async function writeAudit({ actor, action, target, scoreBefore, scoreAfter, reason, meta }) {
  try {
    await AuditLog.create({ actor, action, target, scoreBefore, scoreAfter, reason, meta });
  } catch (err) {
    // Log to stderr so it shows in Render logs without crashing the request
    console.error('[AuditLog] write failed:', err.message);
  }
}

module.exports = { writeAudit };
