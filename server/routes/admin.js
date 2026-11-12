/**
 * Admin routes: manage users, approve/reject verifiers, flag users, view audit logs.
 * All routes require role=admin.
 */
const router      = require('express').Router();
const User        = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const AuditLog    = require('../models/AuditLog');
const authenticate  = require('../middleware/auth');
const requireRole   = require('../middleware/requireRole');

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// GET /api/admin/stats - dashboard summary numbers
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, pendingVerifiers, totalWorkers, totalJobs, recentAudit] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'verifier', status: 'pending' }),
      WorkerProfile.countDocuments(),
      require('../models/Job').countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).select('action target scoreBefore scoreAfter reason createdAt'),
    ]);
    res.json({ totalUsers, pendingVerifiers, totalWorkers, totalJobs, recentAudit });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/verifiers/pending - list all pending verifier accounts
router.get('/verifiers/pending', async (req, res, next) => {
  try {
    const users = await User.find({ role: 'verifier', status: 'pending' })
      .select('name email phone createdAt status')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/verifiers - list all verifiers (any status)
router.get('/verifiers', async (req, res, next) => {
  try {
    const users = await User.find({ role: 'verifier' })
      .select('name email phone createdAt status isFlagged')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/approve - approve a pending verifier
router.put('/users/:id/approve', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'verifier') return res.status(400).json({ error: 'Only verifiers need approval' });
    if (user.status === 'active') return res.status(400).json({ error: 'User is already active' });

    user.status = 'active';
    await user.save();

    await AuditLog.create({
      actor:  req.user.id,
      action: 'VERIFIER_APPROVED',
      target: user._id.toString(),
      reason: `Approved by admin ${req.user.name}`,
    });

    res.json({ message: `${user.name} approved as verifier`, user: { id: user._id, name: user.name, status: user.status } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/reject - reject (delete) a pending verifier
router.put('/users/:id/reject', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await AuditLog.create({
      actor:  req.user.id,
      action: 'VERIFIER_REJECTED',
      target: user._id.toString(),
      reason: `Rejected by admin ${req.user.name}`,
    });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `${user.name} rejected and removed` });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/suspend - suspend any user
router.put('/users/:id/suspend', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended', isFlagged: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    await AuditLog.create({
      actor:  req.user.id,
      action: 'USER_SUSPENDED',
      target: user._id.toString(),
      reason: `Suspended by admin ${req.user.name}`,
    });

    res.json({ message: `${user.name} suspended`, user: { id: user._id, name: user.name, status: user.status } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/reinstate - reinstate a suspended user
router.put('/users/:id/reinstate', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'active', isFlagged: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    await AuditLog.create({
      actor:  req.user.id,
      action: 'USER_REINSTATED',
      target: user._id.toString(),
      reason: `Reinstated by admin ${req.user.name}`,
    });

    res.json({ message: `${user.name} reinstated`, user: { id: user._id, name: user.name, status: user.status } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users - list all users with filters
router.get('/users', async (req, res, next) => {
  try {
    const { role, status } = req.query;
    const filter = {};
    if (role)   filter.role   = role;
    if (status) filter.status = status;

    const users = await User.find(filter)
      .select('name email phone role status isFlagged createdAt')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit - recent audit log
router.get('/audit', async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actor', 'name role');
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
