const mongoose = require('mongoose');

const TRADES = ['electrician', 'plumber', 'tailor', 'mechanic', 'mason', 'hairdresser', 'carpenter'];

const workerProfileSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    trade:       { type: String, enum: TRADES, required: true },
    town:        { type: String, required: true },
    // GeoJSON Point: coordinates are [longitude, latitude]
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    priceMin:     { type: Number, default: 0 },
    priceMax:     { type: Number, default: 0 },
    available:    { type: Boolean, default: true },
    bio:          { type: String, maxlength: 300, default: '' },
    photos:       [{ type: String }],
    trustScore:   { type: Number, default: 0, min: 0, max: 100 },
    trustLevel:   { type: String, enum: ['New', 'Rising', 'Trusted', 'Highly Trusted'], default: 'New' },
    scoreBreakdown: {
      jobs:        { type: Number, default: 0 },
      ratings:     { type: Number, default: 0 },
      vouches:     { type: Number, default: 0 },
      skills:      { type: Number, default: 0 },
      consistency: { type: Number, default: 0 },
    },
    verifiedJobs:  { type: Number, default: 0 },
    ratedJobs:     { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 2dsphere index enables $geoNear queries
workerProfileSchema.index({ location: '2dsphere' });
workerProfileSchema.index({ trade: 1, available: 1 });

module.exports = mongoose.model('WorkerProfile', workerProfileSchema);
module.exports.TRADES = TRADES;
