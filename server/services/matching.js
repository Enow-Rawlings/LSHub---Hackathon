/**
 * Worker search and matching service.
 * Uses MongoDB $geoNear aggregate, then ranks results by a matchScore.
 */
const WorkerProfile = require('../models/WorkerProfile');
const TOWNS         = require('../config/towns');

/**
 * Find workers by trade near a location, ranked by matchScore.
 *
 * @param {object} params
 * @param {string} params.trade      - required
 * @param {number} [params.lat]      - latitude (overridden by town if provided)
 * @param {number} [params.lng]      - longitude
 * @param {string} [params.town]     - town name (resolved to coords via config/towns.js)
 * @param {number} [params.maxKm]    - search radius in km (default 25)
 * @param {number} [params.budget]   - optional budget in XAF
 *
 * @returns {Array} top 10 safe worker objects with matchScore
 */
async function findWorkers({ trade, lat, lng, town, maxKm = 25, budget }) {
  // Resolve coordinates from town name if lat/lng not provided
  if (town) {
    const key  = town.toLowerCase().trim();
    const data = TOWNS[key];
    if (data) {
      lat = data.lat;
      lng = data.lng;
    }
  }

  if (lat === undefined || lng === undefined) {
    throw new Error('Location required: provide lat/lng or a valid town name');
  }

  const maxDistanceMeters = maxKm * 1000;

  // $geoNear must be the first stage in the pipeline
  const pipeline = [
    {
      $geoNear: {
        near:          { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        distanceField: 'distanceMeters',
        maxDistance:   maxDistanceMeters,
        spherical:     true,
        query:         { trade },
      },
    },
    {
      // Join with User to get name
      $lookup: {
        from:         'users',
        localField:   'user',
        foreignField: '_id',
        as:           'userDoc',
      },
    },
    { $unwind: '$userDoc' },
    {
      // Strip sensitive user fields - never expose phone/email
      $project: {
        user:          0,
        'userDoc.phone':    0,
        'userDoc.email':    0,
        'userDoc.password': 0,
      },
    },
  ];

  const results = await WorkerProfile.aggregate(pipeline);

  // Compute matchScore in JavaScript for each result
  const scored = results.map((w) => {
    const distanceKm = w.distanceMeters / 1000;
    const priceFit   = !budget || w.priceMin <= budget ? 1 : 0;

    const matchScore =
      0.50 * (w.trustScore / 100) +
      0.25 * Math.max(0, 1 - distanceKm / maxKm) +
      0.15 * (w.available ? 1 : 0) +
      0.10 * priceFit;

    return {
      workerId:     w._id,
      name:         w.userDoc.name,
      trade:        w.trade,
      town:         w.town,
      trustScore:   w.trustScore,
      trustLevel:   w.trustLevel,
      verifiedJobs: w.verifiedJobs,
      averageRating: w.averageRating,
      distanceKm:   Math.round(distanceKm * 10) / 10,
      priceMin:     w.priceMin,
      priceMax:     w.priceMax,
      available:    w.available,
      matchScore,
    };
  });

  // Sort by matchScore descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  // Fairness rule: if no "New" worker appears in first 5 results, insert the best one at position 5
  const top10 = scored.slice(0, 10);
  const hasNewInTop5 = top10.slice(0, 5).some((w) => w.trustLevel === 'New');

  if (!hasNewInTop5) {
    // Find the best New worker not already in top 5
    const newWorkerIdx = top10.findIndex((w, i) => i >= 5 && w.trustLevel === 'New');
    if (newWorkerIdx !== -1) {
      const [newWorker] = top10.splice(newWorkerIdx, 1);
      top10.splice(4, 0, newWorker); // insert at position 5 (index 4)
    } else {
      // Look beyond top10
      const best = scored.find((w) => w.trustLevel === 'New' && !top10.includes(w));
      if (best) top10.splice(4, 0, best);
    }
  }

  return top10.slice(0, 10);
}

module.exports = { findWorkers };
