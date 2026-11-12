const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['web', 'whatsapp'], required: true },
    userKey:  { type: String, required: true }, // phone number used as identity
    step:     { type: String, default: 'MAIN_MENU' },
    data:     { type: mongoose.Schema.Types.Mixed, default: {} },
    language: { type: String, enum: ['en', 'fr', 'pcm'], default: 'en' },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ channel: 1, userKey: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
