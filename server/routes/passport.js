/**
 * Public passport route - redirects to workers router.
 * Kept here for explicit route mounting at /api/passport/:workerId
 */
const router = require('express').Router();
const workersRouter = require('./workers');

// Delegate to workers router's passport handler
router.get('/:workerId', (req, res, next) => {
  req.url = `/passport/${req.params.workerId}`;
  workersRouter(req, res, next);
});

module.exports = router;
