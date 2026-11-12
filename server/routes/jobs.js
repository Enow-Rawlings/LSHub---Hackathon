/**
 * Job lifecycle routes: create, list, accept, decline, start (code entry), confirm, cancel.
 */
const router            = require('express').Router();
const crypto            = require('crypto');
const { z }             = require('zod');
const Job               = require('../models/Job');
const WorkerProfile     = require('../models/WorkerProfile');
const authenticate      = require('../middleware/auth');
const validate          = require('../middleware/validate');
const { shouldCountJob }     = require('../services/jobs');
const { recalculateWorker }  = require('../services/trustScore');
const { writeAudit }         = require('../services/audit');

const createSchema = z.object({
  workerId:    z.string().length(24),
  description: z.string().min(5).max(300),
});

const confirmSchema = z.object({
  rating:        z.coerce.number().int().min(1).max(5),
  ratingComment: z.string().max(300).optional(),
});

const codeSchema = z.object({
  code: z.string().length(4).regex(/^\d{4}$/),
});

// Serialize a job safely depending on caller role.
// The 4-digit code is ONLY returned to the customer who owns the job and only when status is 'accepted'.
function serializeJob(job, callerId, callerRole) {
  const obj = job.toObject ? job.toObject() : { ...job };
  const isCustomer = callerRole === 'customer' && obj.customer?.toString() === callerId;
  if (!isCustomer || obj.status !== 'accepted') {
    delete obj.code;
  }
  return obj;
}

// POST /api/jobs - customer requests a job
router.post('/', authenticate, async (req, res, next) => {
  try {
    const schema = createSchema.safeParse(req.body);
    if (!schema.success) {
      return res.status(400).json({ error: 'Validation failed', errors: schema.error.errors });
    }
    const { workerId, description } = schema.data;

    const profile = await WorkerProfile.findById(workerId);
    if (!profile) return res.status(404).json({ error: 'Worker not found' });

    const job = await Job.create({
      customer:    req.user.id,
      worker:      workerId,
      description,
    });

    res.status(201).json({ job: serializeJob(job, req.user.id, req.user.role) });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/mine - list jobs for the authenticated customer or worker
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'customer') {
      query = Job.find({ customer: req.user.id }).sort({ createdAt: -1 });
    } else if (req.user.role === 'worker') {
      const profile = await WorkerProfile.findOne({ user: req.user.id });
      if (!profile) return res.status(404).json({ error: 'Worker profile not found' });
      query = Job.find({ worker: profile._id }).sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ error: 'Only workers and customers can view jobs' });
    }

    // Populate worker profile and customer name (no sensitive fields)
    const jobs = await query
      .populate({ path: 'worker', populate: { path: 'user', select: 'name' } })
      .populate('customer', 'name');

    // Serialize with code visibility rules
    const serialized = jobs.map((j) => serializeJob(j, req.user.id, req.user.role));
    res.json({ jobs: serialized });
  } catch (err) {
    next(err);
  }
});

// PUT /api/jobs/:id/accept - worker accepts a job and a code is generated
router.put('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).select('+code');
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Only the assigned worker can accept
    const profile = await WorkerProfile.findOne({ user: req.user.id });
    if (!profile || profile._id.toString() !== job.worker.toString()) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'requested') {
      return res.status(400).json({ error: `Cannot accept a job with status: ${job.status}` });
    }

    // Generate a 4-digit code using crypto (not Math.random)
    const code    = String(crypto.randomInt(1000, 9999)).padStart(4, '0');
    job.code      = code;
    job.status    = 'accepted';
    job.acceptedAt = new Date();
    await job.save();

    // Worker does NOT get the code - return job without it
    const obj = job.toObject();
    delete obj.code;
    res.json({ job: obj });
  } catch (err) {
    next(err);
  }
});

// PUT /api/jobs/:id/decline - worker declines
router.put('/:id/decline', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const profile = await WorkerProfile.findOne({ user: req.user.id });
    if (!profile || profile._id.toString() !== job.worker.toString()) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!['requested'].includes(job.status)) {
      return res.status(400).json({ error: `Cannot decline a job with status: ${job.status}` });
    }

    job.status = 'declined';
    await job.save();
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/start - worker enters the 4-digit code to start the job
router.post('/:id/start', authenticate, validate(codeSchema), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).select('+code');
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Only the assigned worker can start
    const profile = await WorkerProfile.findOne({ user: req.user.id });
    if (!profile || profile._id.toString() !== job.worker.toString()) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'accepted') {
      return res.status(400).json({ error: `Cannot start a job with status: ${job.status}` });
    }

    // Check if job is locked due to too many wrong attempts
    if (job.lockedUntil && job.lockedUntil > new Date()) {
      const wait = Math.ceil((job.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many wrong attempts. Try again in ${wait} minute(s)` });
    }

    if (req.body.code !== job.code) {
      job.codeAttempts += 1;

      if (job.codeAttempts >= 5) {
        job.lockedUntil  = new Date(Date.now() + 15 * 60 * 1000);
        job.codeAttempts = 0;
        await job.save();
        return res.status(429).json({ error: 'Too many wrong attempts. Job locked for 15 minutes' });
      }

      await job.save();
      const remaining = 5 - job.codeAttempts;
      return res.status(400).json({ error: `Incorrect code. ${remaining} attempt(s) remaining` });
    }

    job.status    = 'in_progress';
    job.startedAt = new Date();
    job.codeAttempts = 0;
    job.lockedUntil  = null;
    await job.save();

    const obj = job.toObject();
    delete obj.code;
    res.json({ job: obj });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/confirm - customer confirms completion and rates the job
router.post('/:id/confirm', authenticate, validate(confirmSchema), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Only the owning customer can confirm
    if (job.customer.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'in_progress') {
      return res.status(400).json({ error: `Cannot confirm a job with status: ${job.status}` });
    }

    job.status        = 'confirmed';
    job.confirmedAt   = new Date();
    job.rating        = req.body.rating;
    job.ratingComment = req.body.ratingComment;
    await job.save();

    // Apply counting rules
    const { counted, reason } = await shouldCountJob(job._id);
    job.countedForScore = counted;
    await job.save();

    if (!counted) {
      await writeAudit({
        action: 'JOB_SKIPPED',
        target: job._id.toString(),
        reason,
        meta: { customerId: req.user.id, workerId: job.worker },
      });
    }

    // Recalculate the worker's trust score
    await recalculateWorker(job.worker.toString(), `job confirmed (counted=${counted})`);

    res.json({ job, counted, message: counted ? 'Job confirmed and score updated' : `Job confirmed but not counted: ${reason}` });
  } catch (err) {
    next(err);
  }
});

// PUT /api/jobs/:id/cancel - customer or worker cancels
router.put('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const profile = req.user.role === 'worker'
      ? await WorkerProfile.findOne({ user: req.user.id })
      : null;

    const isCustomer = req.user.role === 'customer' && job.customer.toString() === req.user.id;
    const isWorker   = profile && profile._id.toString() === job.worker.toString();

    if (!isCustomer && !isWorker) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (['confirmed', 'declined', 'cancelled'].includes(job.status)) {
      return res.status(400).json({ error: `Cannot cancel a job with status: ${job.status}` });
    }

    job.status = 'cancelled';
    await job.save();
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
