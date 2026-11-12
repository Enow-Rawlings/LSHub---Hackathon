const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    customer:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker:         { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile', required: true },
    description:    { type: String, required: true, maxlength: 300 },
    status: {
      type:    String,
      enum:    ['requested', 'accepted', 'in_progress', 'confirmed', 'declined', 'cancelled'],
      default: 'requested',
    },
    // 4-digit confirmation code, never returned to the worker (enforced by serializer)
    code:           { type: String, select: false },
    codeAttempts:   { type: Number, default: 0 },
    lockedUntil:    { type: Date },
    rating:         { type: Number, min: 1, max: 5 },
    ratingComment:  { type: String, maxlength: 300 },
    // Whether this job was counted toward the worker's trust score
    countedForScore: { type: Boolean, default: false },
    acceptedAt:     { type: Date },
    startedAt:      { type: Date },
    confirmedAt:    { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ customer: 1, worker: 1, status: 1 });

module.exports = mongoose.model('Job', jobSchema);
