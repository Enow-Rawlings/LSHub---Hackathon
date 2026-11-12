const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    phone:         { type: String, unique: true, required: true, trim: true },
    // password is never returned by default (select: false)
    password:      { type: String, select: false },
    role:          { type: String, enum: ['worker', 'customer', 'verifier', 'admin'], default: 'customer' },
    language:      { type: String, enum: ['en', 'fr', 'pcm'], default: 'en' },
    phoneVerified: { type: Boolean, default: false },
    isFlagged:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before save if it was modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare a plain password to the stored hash
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
