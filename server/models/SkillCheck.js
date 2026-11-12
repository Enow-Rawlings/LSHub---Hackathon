const mongoose = require('mongoose');

const skillCheckSchema = new mongoose.Schema(
  {
    worker:   { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile', required: true },
    verifier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trade:    { type: String, required: true },
    skill:    { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// A verifier can only sign off a specific skill for a worker once
skillCheckSchema.index({ worker: 1, verifier: 1, skill: 1 }, { unique: true });

module.exports = mongoose.model('SkillCheck', skillCheckSchema);
