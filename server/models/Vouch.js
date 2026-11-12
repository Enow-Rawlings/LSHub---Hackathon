const mongoose = require('mongoose');

const vouchSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile', required: true },
    comment:  { type: String, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

// A verifier can only vouch for a worker once
vouchSchema.index({ fromUser: 1, toWorker: 1 }, { unique: true });

module.exports = mongoose.model('Vouch', vouchSchema);
