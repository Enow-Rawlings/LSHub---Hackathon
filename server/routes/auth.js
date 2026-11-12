/**
 * Authentication routes: register, login, verify-otp (demo mode).
 */
const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');
const User    = require('../models/User');
const validate = require('../middleware/validate');

const registerSchema = z.object({
  name:       z.string().min(2).max(100),
  email:      z.string().email().optional(),
  phone:      z.string().min(8).max(20),
  password:   z.string().min(6).max(100),
  role:       z.enum(['worker', 'customer', 'verifier']).default('customer'),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  phone:    z.string().min(8).max(20),
  password: z.string().min(1),
});

const otpSchema = z.object({
  phone: z.string().min(8).max(20),
  otp:   z.string().length(6),
});

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, phone, password, role, inviteCode } = req.body;

    // Admin cannot self-register
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be self-registered' });
    }

    // Verifier requires a valid invite code
    if (role === 'verifier') {
      if (inviteCode !== process.env.VERIFIER_INVITE_CODE) {
        return res.status(403).json({ error: 'Invalid verifier invite code' });
      }
    }

    // Check for duplicate phone or email
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(409).json({ error: 'Phone number already registered' });

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(409).json({ error: 'Email already registered' });
    }

    const user  = await User.create({ name, email, phone, password, role });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role, language: user.language },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Always load password field explicitly (it has select: false)
    const user = await User.findOne({ phone }).select('+password');

    // Use a constant-time comparison path - same error regardless of which check fails
    const valid = user && (await user.comparePassword(password));
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, language: user.language },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp  (demo mode: accepts 123456)
router.post('/verify-otp', validate(otpSchema), async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    // Demo mode: only 123456 is accepted
    if (otp !== '123456') {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { phoneVerified: true },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Phone verified', verified: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
