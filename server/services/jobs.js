/**
 * Job counting rules service.
 * Determines whether a confirmed job should count toward the Trust Score.
 */
const Job  = require('../models/Job');
const User = require('../models/User');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Decide if a newly confirmed job should count toward the worker's trust score.
 * Returns { counted: boolean, reason: string }
 */
async function shouldCountJob(jobId) {
  const job = await Job.findById(jobId).populate('customer');
  if (!job) return { counted: false, reason: 'job not found' };

  const customer = job.customer;
  const workerId = job.worker;

  // Rule: same user cannot be both customer and worker
  const workerProfile = await require('../models/WorkerProfile').findById(workerId).select('user');
  if (workerProfile && workerProfile.user.toString() === customer._id.toString()) {
    return { counted: false, reason: 'customer and worker are the same user' };
  }

  // Rule: same phone number
  if (workerProfile) {
    const workerUser = await User.findById(workerProfile.user).select('phone');
    if (workerUser && workerUser.phone === customer.phone) {
      return { counted: false, reason: 'customer and worker share the same phone number' };
    }
  }

  // Rule: same pair already has a counted confirmed job in the last 7 days
  const recent = await Job.findOne({
    customer:        customer._id,
    worker:          workerId,
    status:          'confirmed',
    countedForScore: true,
    confirmedAt:     { $gte: new Date(Date.now() - SEVEN_DAYS_MS) },
    _id:             { $ne: jobId }, // exclude the current job
  });

  if (recent) {
    return { counted: false, reason: 'duplicate job for same pair within 7 days' };
  }

  return { counted: true, reason: 'ok' };
}

module.exports = { shouldCountJob };
