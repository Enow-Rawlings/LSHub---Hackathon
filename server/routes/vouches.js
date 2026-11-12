/**
 * Vouch and SkillCheck routes for verified users.
 */
const router            = require('express').Router();
const { z }             = require('zod');
const Vouch             = require('../models/Vouch');
const SkillCheck        = require('../models/SkillCheck');
const WorkerProfile     = require('../models/WorkerProfile');
const authenticate      = require('../middleware/auth');
const requireRole       = require('../middleware/requireRole');
const validate          = require('../middleware/validate');
const { recalculateWorker } = require('../services/trustScore');

const vouchSchema = z.object({
  workerId: z.string().length(24),
  comment:  z.string().max(200).default(''),
});

const skillSchema = z.object({
  workerId: z.string().length(24),
  skill:    z.string().min(2).max(100).trim(),
});

// POST /api/vouches - verifier creates a vouch
router.post('/vouches', authenticate, requireRole('verifier', 'admin'), validate(vouchSchema), async (req, res, next) => {
  try {
    const { workerId, comment } = req.body;

    const profile = await WorkerProfile.findById(workerId);
    if (!profile) return res.status(404).json({ error: 'Worker not found' });

    // Prevent self-vouching
    if (profile.user.toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot vouch for yourself' });
    }

    const existing = await Vouch.findOne({ fromUser: req.user.id, toWorker: workerId });
    if (existing) return res.status(409).json({ error: 'You have already vouched for this worker' });

    const vouch = await Vouch.create({ fromUser: req.user.id, toWorker: workerId, comment });

    // Recalculate score after new vouch
    await recalculateWorker(workerId, 'vouch created');

    res.status(201).json({ vouch });
  } catch (err) {
    next(err);
  }
});

// POST /api/skillchecks - verifier signs off a skill
router.post('/skillchecks', authenticate, requireRole('verifier', 'admin'), validate(skillSchema), async (req, res, next) => {
  try {
    const { workerId, skill } = req.body;

    const profile = await WorkerProfile.findById(workerId);
    if (!profile) return res.status(404).json({ error: 'Worker not found' });

    const existing = await SkillCheck.findOne({ worker: workerId, verifier: req.user.id, skill });
    if (existing) return res.status(409).json({ error: 'You have already signed off this skill for this worker' });

    const check = await SkillCheck.create({
      worker:   workerId,
      verifier: req.user.id,
      trade:    profile.trade,
      skill,
    });

    // Recalculate score after new skill check
    await recalculateWorker(workerId, 'skill check created');

    res.status(201).json({ skillCheck: check });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
