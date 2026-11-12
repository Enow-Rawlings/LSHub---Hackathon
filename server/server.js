/**
 * VouchPass API server entry point.
 * Applies security middleware, mounts all routes, handles errors.
 */
require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const cors       = require('cors');

const { authLimiter, botLimiter, searchLimiter } = require('./middleware/rateLimits');

const authRoutes    = require('./routes/auth');
const workerRoutes  = require('./routes/workers');
const jobRoutes     = require('./routes/jobs');
const vouchRoutes   = require('./routes/vouches');
const webChannel    = require('./channels/webChannel');
const adminRoutes   = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ---- Security middleware ----
app.use(helmet());

// CORS: allow localhost in dev and the deployed Vercel URL in production
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173', // vite preview
];

// Also allow any *.vercel.app subdomain for preview deployments
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.onrender\.com$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// Body parser - 100kb limit to prevent large payload attacks
app.use(express.json({ limit: '100kb' }));

// Handle CORS preflight for all routes (Express 5 requires explicit wildcard syntax)
app.options('/{*path}', cors());

// ---- Routes ----
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/workers', searchLimiter); // apply to search specifically
app.use('/api',         vouchRoutes);   // mounts /api/vouches and /api/skillchecks
app.use('/api/jobs',    jobRoutes);
app.use('/api/bot/web', botLimiter, webChannel);
app.use('/api/admin',  adminRoutes);

// Public passport route at /api/passport/:workerId - delegate to workers router
app.use('/api/passport', workerRoutes);

// Central error handler: hides stack traces in production
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) console.error('[Error]', err);

  res.status(status).json({
    error: isProd ? 'An unexpected error occurred' : err.message,
  });
});

// ---- DB Connection and start ----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`VouchPass server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
