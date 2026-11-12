const mongoose = require('mongoose');

const processedMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 172800 }, // TTL: 2 days = 172800 seconds
});

module.exports = mongoose.model('ProcessedMessage', processedMessageSchema);
