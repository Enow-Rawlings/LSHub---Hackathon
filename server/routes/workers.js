/**
 * Worker profile routes: create, view, update, search, passport.
 */
const router        = require('express').Router();
const { z }         = require('zod');
const WorkerProfile = require('../models/WorkerProfile');
const Job           = require('../models/Job');
const Vouch         = require('../models/Vouch');
const SkillCheck    = require('../models/SkillCheck');
const authenticate  = require('../middleware/auth');
const requireRole   = require('../middleware/requireRole');
const validate      = require('../middleware/validate');
const { findWorkers } = require('../services/matching');
const TOWNS         = require('../config/towns');
const { TRADES }    = require('../models/WorkerProfile');

const profileSchema = z.object({
  trade:    z.enum(TRADES),
  town:     z.string().min(2).max(100),
  priceMin: z.coerce.number().min(0).default(0),
  priceMax: z.coerce.number().min(0).default(0),
  available: z.coerce.boolean().default(true),
  bio:      z.string().max(300).default(''),
  lat:      z.coerce.number().optional(),
  lng:      z.coerce.number().optional(),
});

const updateSchema = profileSchema.partial();

// Resolve coordinates: from request or from towns config
function resolveCoords(lat, lng, town) {
  if (lat !== undefined && lng !== undefined) return { lat, lng };
  const key  = town ? town.toLowerCase().trim() : '';
  const data = TOWNS[key];
  if (data) return { lat: data.lat, lng: data.lng };
  // Default to Buea if unresolvable
  return { lat: 4.15, lng: 9.24 };
}

// POST /api/workers - worker creates their own profile
router.post('/', authenticate, requireRole('worker'), validate(profileSchema), async (req, res, next) => {
  try {
    const existing = await WorkerProfile.findOne({ user: req.user.id });
    if (existing) return res.status(409).json({ error: 'Profile already exists, use PUT /workers/me' });

    const { trade, town, priceMin, priceMax, available, bio, lat, lng } = req.body;
    const coords = resolveCoords(lat, lng, town);

    const profile = await WorkerProfile.create({
      user:     req.user.id,
      trade,
      town,
      location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      priceMin,
      priceMax,
      available,
      bio,
    });

    res.status(201).json({ profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/workers/me - worker views their own profile
router.get('/me', authenticate, requireRole('worker'), async (req, res, next) => {
  try {
    const profile = await WorkerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// PUT /api/workers/me - worker updates their profile
router.put('/me', authenticate, requireRole('worker'), validate(updateSchema), async (req, res, next) => {
  try {
    const profile = await WorkerProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Whitelist fields to prevent mass assignment
    const allowed = ['trade', 'town', 'priceMin', 'priceMax', 'available', 'bio'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) profile[key] = req.body[key];
    }

    // Update location if coordinates provided
    if (req.body.lat !== undefined || req.body.lng !== undefined || req.body.town !== undefined) {
      const coords = resolveCoords(req.body.lat, req.body.lng, req.body.town || profile.town);
      profile.location = { type: 'Point', coordinates: [coords.lng, coords.lat] };
    }

    await profile.save();
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/workers/search - public search endpoint
router.get('/search', async (req, res, next) => {
  try {
    const { trade, lat, lng, town, maxKm, budget } = req.query;

    if (!trade) return res.status(400).json({ error: 'trade is required' });

    const results = await findWorkers({
      trade,
      lat:   lat   ? parseFloat(lat)   : undefined,
      lng:   lng   ? parseFloat(lng)   : undefined,
      town:  town  || undefined,
      maxKm: maxKm ? parseFloat(maxKm) : 25,
      budget: budget ? parseFloat(budget) : undefined,
    });

    res.json({ workers: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/passport/:workerId - public Trust Passport
router.get('/passport/:workerId', async (req, res, next) => {
  try {
    const profile = await WorkerProfile.findById(req.params.workerId).populate('user', 'name createdAt');
    if (!profile) return res.status(404).json({ error: 'Worker not found' });

    // Vouches: show verifier name and comment but not phone/email
    const vouches = await Vouch.find({ toWorker: profile._id })
      .populate('fromUser', 'name role')
      .sort({ createdAt: -1 });

    // Skill checks
    const skills = await SkillCheck.find({ worker: profile._id })
      .populate('verifier', 'name')
      .sort({ createdAt: -1 });

    // Last 5 confirmed job ratings - no customer names
    const recentRatings = await Job.find({
      worker: profile._id,
      status: 'confirmed',
      rating: { $exists: true },
    })
      .sort({ confirmedAt: -1 })
      .limit(5)
      .select('rating ratingComment confirmedAt description');

    // Safe response - never expose phone, email
    res.json({
      workerId:     profile._id,
      name:         profile.user.name,
      trade:        profile.trade,
      town:         profile.town,
      bio:          profile.bio,
      trustScore:   profile.trustScore,
      trustLevel:   profile.trustLevel,
      scoreBreakdown: profile.scoreBreakdown,
      verifiedJobs: profile.verifiedJobs,
      ratedJobs:    profile.ratedJobs,
      averageRating: profile.averageRating,
      priceMin:     profile.priceMin,
      priceMax:     profile.priceMax,
      available:    profile.available,
      memberSince:  profile.user.createdAt,
      vouches: vouches.map((v) => ({
        verifierName: v.fromUser.name,
        comment:      v.comment,
        date:         v.createdAt,
      })),
      skills: skills.map((s) => ({
        skill:        s.skill,
        verifierName: s.verifier.name,
        date:         s.createdAt,
      })),
      recentRatings: recentRatings.map((j) => ({
        rating:        j.rating,
        comment:       j.ratingComment,
        date:          j.confirmedAt,
        description:   j.description,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
