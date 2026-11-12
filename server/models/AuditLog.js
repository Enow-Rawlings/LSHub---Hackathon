const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who triggered it (optional)
    action:      { type: String, required: true },
    target:      { type: String }, // e.g. workerId or jobId
    scoreBefore: { type: Number },
    scoreAfter:  { type: Number },
    reason:      { type: String },
    meta:        { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
