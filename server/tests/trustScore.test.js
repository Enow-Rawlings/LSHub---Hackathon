/**
 * Unit tests for the Trust Score engine.
 * Uses Node.js built-in test runner (node:test).
 * Run: node --test tests/trustScore.test.js
 */
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { computeTrustScore } = require('../services/trustScore');

function makeJobs(count, daysOld = 10) {
  return Array.from({ length: count }, () => ({
    confirmedAt: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000),
  }));
}

// 1. Brand new worker scores 0 and is New
test('brand new worker scores 0 and is New', () => {
  const result = computeTrustScore({ jobs: [], ratedJobs: 0, avgRating: 0, vouches: [], distinctSkillChecks: 0, accountAgeDays: 0, isFlagged: false });
  assert.equal(result.score, 0);
  assert.equal(result.level, 'New');
});

// 2. 10 counted fresh jobs with average rating 5 gives 60 (no vouches, account younger than 90 days)
test('10 fresh jobs with avg rating 5 and 10 rated jobs = score 60', () => {
  const result = computeTrustScore({ jobs: makeJobs(10), ratedJobs: 10, avgRating: 5, vouches: [], distinctSkillChecks: 0, accountAgeDays: 30, isFlagged: false });
  assert.equal(result.score, 60);
});

// 3. One vouch from a voucher with score 80 adds 4 points (to a 0-base worker)
test('one vouch from voucherScore 80 adds 4 pts', () => {
  const result = computeTrustScore({ jobs: [], ratedJobs: 0, avgRating: 0, vouches: [{ voucherScore: 80, isReciprocal: false }], distinctSkillChecks: 0, accountAgeDays: 0, isFlagged: false });
  // vouchValue = 5 * (80/100) = 4
  assert.equal(result.breakdown.vouches, 4);
  assert.equal(result.score, 4);
});

// 4. The same vouch becomes 2 points when reciprocal
test('reciprocal vouch from voucherScore 80 adds 2 pts', () => {
  const result = computeTrustScore({ jobs: [], ratedJobs: 0, avgRating: 0, vouches: [{ voucherScore: 80, isReciprocal: true }], distinctSkillChecks: 0, accountAgeDays: 0, isFlagged: false });
  // halved: 4 / 2 = 2
  assert.equal(result.breakdown.vouches, 2);
  assert.equal(result.score, 2);
});

// 5. A vouch from a voucher with score 15 adds 0 points
test('vouch from voucherScore 15 adds 0 pts (below threshold)', () => {
  const result = computeTrustScore({ jobs: [], ratedJobs: 0, avgRating: 0, vouches: [{ voucherScore: 15, isReciprocal: false }], distinctSkillChecks: 0, accountAgeDays: 0, isFlagged: false });
  assert.equal(result.breakdown.vouches, 0);
  assert.equal(result.score, 0);
});

// 6. Jobs older than 365 days count half
test('old jobs (>365 days) count as 0.5 each', () => {
  const oldJobs  = makeJobs(2, 400); // 400 days old -> 0.5 each = 1 effective
  const freshJobs = makeJobs(2, 10);  // fresh -> 1 each = 2 effective
  // effectiveJobs = 1 + 2 = 3 -> jobsPts = 3 * 4 = 12
  const result = computeTrustScore({ jobs: [...oldJobs, ...freshJobs], ratedJobs: 0, avgRating: 0, vouches: [], distinctSkillChecks: 0, accountAgeDays: 0, isFlagged: false });
  assert.equal(result.breakdown.jobs, 12);
});

// 7. Ratings give 0 points when fewer than 3 rated jobs
test('ratings give 0 pts with fewer than 3 rated jobs', () => {
  const result = computeTrustScore({ jobs: makeJobs(1), ratedJobs: 2, avgRating: 5, vouches: [], distinctSkillChecks: 0, accountAgeDays: 0, isFlagged: false });
  assert.equal(result.breakdown.ratings, 0);
});
