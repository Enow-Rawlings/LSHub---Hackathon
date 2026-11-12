/**
 * Authentication routes: register, login, verify-otp (demo), google-signin.
 */
const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const { z }    = require('zod');
const { OAuth2Client } = require('google-auth-library');
const User     = require('../models/User');
const validate = require('../middleware/validate');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

const googleSchema = z.object({
  credential: z.string().min(10), // Google ID token
  role:       z.enum(['worker', 'customer', 'verifier']).default('customer'),
  inviteCode: z.string().optional(),
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

    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be self-registered' });
    }
    if (role === 'verifier' && inviteCode !== process.env.VERIFIER_INVITE_CODE) {
      return res.status(403).json({ error: 'Invalid verifier invite code' });
    }

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
      user: { id: user._id, name: user.name, role: user.role, language: user.language, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user  = await User.findOne({ phone }).select('+password');
    const valid = user && (await user.comparePassword(password));
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, language: user.language, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp  (demo mode: accepts 123456)
router.post('/verify-otp', validate(otpSchema), async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (otp !== '123456') return res.status(400).json({ error: 'Invalid OTP' });

    const user = await User.findOneAndUpdate({ phone }, { phoneVerified: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Phone verified', verified: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google
// Accepts a Google ID token from the client (@react-oauth/google), verifies it,
// then finds or creates a user. No password needed.
router.post('/google', validate(googleSchema), async (req, res, next) => {
  try {
    const { credential, role, inviteCode } = req.body;

    // Verify the token with Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    // Block verifier self-signup via Google without invite code
    if (role === 'verifier' && inviteCode !== process.env.VERIFIER_INVITE_CODE) {
      return res.status(403).json({ error: 'Invalid verifier invite code' });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // New user - create with Google identity, no password required
      user = await User.create({
        name,
        email,
        googleId,
        avatar:        picture,
        role,
        phoneVerified: true, // Google email is pre-verified
        // phone is optional for Google users; set a placeholder
        phone: `google_${googleId}`,
      });
    } else {
      // Returning user - update avatar and googleId if not set
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, language: user.language, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
