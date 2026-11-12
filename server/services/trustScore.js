/**
 * Trust Score engine for VouchPass.
 * computeTrustScore is a pure function - no DB access - so it is fully unit testable.
 * recalculateWorker loads data, calls computeTrustScore, persists the result, and writes an AuditLog.
 */

const WorkerProfile = require('../models/WorkerProfile');
const Job           = require('../models/Job');
const Vouch         = require('../models/Vouch');
const SkillCheck    = require('../models/SkillCheck');
const AuditLog      = require('../models/AuditLog');

// Default trust score given to approved verifiers who have no WorkerProfile
const VERIFIER_DEFAULT_SCORE = 60;

/**
 * Determine the trust level label from a numeric score.
 */
function getLevel(score) {
  if (score >= 75) return 'Highly Trusted';
  if (score >= 50) return 'Trusted';
  if (score >= 25) return 'Rising';
  return 'New';
}

/**
 * Clamp a value between min and max.
 */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * computeTrustScore - pure function, no I/O.
 *
 * @param {object} input
 * @param {Array}  input.jobs              - confirmed Job docs (countedForScore=true)
 * @param {number} input.ratedJobs         - count of jobs that have a rating
 * @param {number} input.avgRating         - average star rating (1-5)
 * @param {Array}  input.vouches           - Vouch docs, each with { voucherScore, isReciprocal }
 * @param {number} input.distinctSkillChecks - count of unique skill names verified
 * @param {number} input.accountAgeDays    - age of the User account in days
 * @param {boolean} input.isFlagged        - whether the user is flagged
 *
 * @returns {{ score: number, level: string, breakdown: object }}
 */
function computeTrustScore({
  jobs = [],
  ratedJobs = 0,
  avgRating = 0,
  vouches = [],
  distinctSkillChecks = 0,
  accountAgeDays = 0,
  isFlagged = false,
}) {
  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  // Jobs component (max 40 pts): jobs older than 1 year count 0.5
  const effectiveJobs = jobs.reduce((sum, job) => {
    const ageMs = now - new Date(job.confirmedAt).getTime();
    return sum + (ageMs <= ONE_YEAR_MS ? 1 : 0.5);
  }, 0);
  const jobsPts = Math.min(40, 4 * effectiveJobs);

  // Ratings component (max 20 pts): only counts when >= 3 rated jobs
  const ratingsPts = ratedJobs >= 3 ? ((avgRating - 1) / 4) * 20 : 0;

  // Vouches component (max 25 pts)
  let vouchSum = 0;
  for (const v of vouches) {
    const vs = v.voucherScore;
    if (vs < 20) continue; // too low to contribute
    let val = 5 * (vs / 100);
    if (v.isReciprocal) val = val / 2; // halved for reciprocal rings
    vouchSum += val;
  }
  const vouchPts = Math.min(25, vouchSum);

  // Skills component (max 10 pts)
  const skillPts = Math.min(10, 5 * distinctSkillChecks);

  // Consistency component (5 pts): account >= 90 days old and not flagged
  const consistencyPts = accountAgeDays >= 90 && !isFlagged ? 5 : 0;

  const rawScore = jobsPts + ratingsPts + vouchPts + skillPts + consistencyPts;
  const score    = Math.round(clamp(rawScore, 0, 100));
  const level    = getLevel(score);

  return {
    score,
    level,
    breakdown: {
      jobs:        Math.round(jobsPts * 10) / 10,
      ratings:     Math.round(ratingsPts * 10) / 10,
      vouches:     Math.round(vouchPts * 10) / 10,
      skills:      Math.round(skillPts * 10) / 10,
      consistency: consistencyPts,
    },
  };
}

/**
 * recalculateWorker - loads all needed data, computes score, saves to DB, writes audit log.
 *
 * @param {string} workerId - WorkerProfile _id
 * @param {string} [reason] - why the recalc was triggered (for the audit log)
 */
async function recalculateWorker(workerId, reason = 'manual') {
  const profile = await WorkerProfile.findById(workerId).populate('user');
  if (!profile) throw new Error(`WorkerProfile ${workerId} not found`);

  const user = profile.user;
  const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  // Load all counted confirmed jobs
  const confirmedJobs = await Job.find({
    worker: workerId,
    status: 'confirmed',
    countedForScore: true,
  }).select('confirmedAt rating');

  const ratedJobs    = confirmedJobs.filter((j) => j.rating).length;
  const avgRating    = ratedJobs > 0
    ? confirmedJobs.filter((j) => j.rating).reduce((s, j) => s + j.rating, 0) / ratedJobs
    : 0;

  // Load vouches and determine voucherScore + reciprocal flag
  const rawVouches = await Vouch.find({ toWorker: workerId }).populate({
    path: 'fromUser',
    select: '_id',
  });

  const voucherWorkerProfileIds = rawVouches.map((v) => v.fromUser._id);
  const voucherProfiles = await WorkerProfile.find({ user: { $in: voucherWorkerProfileIds } }).select('user trustScore');

  // Build a map: userId -> voucherScore
  const scoreMap = {};
  for (const vp of voucherProfiles) {
    scoreMap[vp.user.toString()] = vp.trustScore;
  }

  // Check for reciprocal vouches: does this worker's user vouch back for each voucher's worker?
  // We need: Vouch where fromUser = profile.user AND toWorker = voucher's WorkerProfile
  const voucherWorkerProfiles = voucherProfiles.reduce((m, vp) => {
    m[vp.user.toString()] = vp._id.toString();
    return m;
  }, {});

  const vouches = await Promise.all(
    rawVouches.map(async (v) => {
      const vUserId     = v.fromUser._id.toString();
      const vs          = scoreMap[vUserId] !== undefined ? scoreMap[vUserId] : VERIFIER_DEFAULT_SCORE;
      const vWorkerPId  = voucherWorkerProfiles[vUserId];
      let isReciprocal  = false;

      if (vWorkerPId) {
        // Does the original worker also vouch for the voucherWorker?
        const reciprocal = await Vouch.findOne({
          fromUser: profile.user._id,
          toWorker: vWorkerPId,
        });
        isReciprocal = !!reciprocal;
      }

      return { voucherScore: vs, isReciprocal };
    })
  );

  // Distinct skill checks (by skill name)
  const skillChecks = await SkillCheck.find({ worker: workerId }).select('skill');
  const distinctSkillChecks = new Set(skillChecks.map((s) => s.skill.toLowerCase())).size;

  const { score, level, breakdown } = computeTrustScore({
    jobs: confirmedJobs,
    ratedJobs,
    avgRating,
    vouches,
    distinctSkillChecks,
    accountAgeDays,
    isFlagged: user.isFlagged,
  });

  const scoreBefore = profile.trustScore;

  // Persist results
  profile.trustScore      = score;
  profile.trustLevel      = level;
  profile.scoreBreakdown  = breakdown;
  profile.verifiedJobs    = confirmedJobs.length;
  profile.ratedJobs       = ratedJobs;
  profile.averageRating   = Math.round(avgRating * 10) / 10;
  await profile.save();

  // Write audit entry
  await AuditLog.create({
    actor:  null,
    action: 'SCORE_RECALCULATE',
    target: workerId.toString(),
    scoreBefore,
    scoreAfter: score,
    reason,
  });

  return { score, level, breakdown };
}

module.exports = { computeTrustScore, recalculateWorker, getLevel, VERIFIER_DEFAULT_SCORE };
