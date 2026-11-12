/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches req.user = { id, role, name }.
 */
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token   = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm the user still exists and is not flagged/deleted
    const user = await User.findById(decoded.id).select('_id role name isFlagged');
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    req.user = { id: user._id.toString(), role: user.role, name: user.name };
    next();
  } catch (err) {
    // Expired or malformed token - return the same generic message to avoid leaking info
    return res.status(401).json({ error: 'Authentication required' });
  }
}

module.exports = authenticate;
