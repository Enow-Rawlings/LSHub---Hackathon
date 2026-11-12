/**
 * Channel-independent bot engine for VouchPass.
 * handleMessage processes one message and returns structured replies.
 * Both the web simulator and the WhatsApp channel call this.
 */
const crypto        = require('crypto');
const User          = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const Job           = require('../models/Job');
const Conversation  = require('../models/Conversation');
const { findWorkers }     = require('../services/matching');
const { recalculateWorker } = require('../services/trustScore');
const { shouldCountJob }  = require('../services/jobs');
const { t }               = require('./messages');
const TOWNS               = require('../config/towns');
const { TRADES }          = require('../models/WorkerProfile');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Helpers to build typed reply objects
function textReply(body) { return { type: 'text', body }; }
function buttonsReply(body, options) { return { type: 'buttons', body, options }; }
function listReply(body, options) { return { type: 'list', body, options }; }

// Get or create a Conversation state record
async function getConversation(channel, userKey) {
  let conv = await Conversation.findOne({ channel, userKey });
  if (!conv) {
    conv = await Conversation.create({ channel, userKey, step: 'MAIN_MENU', data: {}, language: 'en' });
  }
  return conv;
}

// Get or create a lightweight user from phone number (bot / demo mode)
async function getOrCreateBotUser(phone, role = 'customer') {
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      name:  `User ${phone.slice(-4)}`,
      phone,
      role,
      password: crypto.randomBytes(16).toString('hex'), // random password, bot-only account
    });
  }
  return user;
}

/**
 * Main entry point for the bot.
 *
 * @param {object} params
 * @param {string} params.channel   - 'web' or 'whatsapp'
 * @param {string} params.userKey   - phone number
 * @param {string} [params.messageId] - for de-dup
 * @param {string} [params.text]    - typed message
 * @param {string} [params.buttonId] - button/list reply id
 * @param {object} [params.location] - { lat, lng }
 *
 * @returns {{ replies: Array }}
 */
async function handleMessage({ channel, userKey, messageId, text = '', buttonId, location }) {
  const conv = await getConversation(channel, userKey);
  const lang = conv.language || 'en';
  const step = conv.step;

  // "menu" or "typing menu" resets to main menu at any time
  const normalizedText = text.trim().toLowerCase();
  if (normalizedText === 'menu' || normalizedText === 'restart') {
    conv.step = 'MAIN_MENU';
    conv.data = {};
    await conv.save();
    return { replies: [mainMenuReply(lang)] };
  }

  const input = buttonId || normalizedText;

  // Route based on current step
  switch (step) {
    case 'MAIN_MENU':       return handleMainMenu(conv, input, lang);
    case 'ASK_TRADE':       return handleAskTrade(conv, input, lang);
    case 'ASK_LOCATION':    return handleAskLocation(conv, input, location, lang);
    case 'SHOW_RESULTS':    return handleShowResults(conv, input, lang);
    case 'ASK_JOB_DESC':    return handleAskJobDesc(conv, text, lang);

    case 'W_NAME':          return handleWorkerName(conv, text, lang);
    case 'W_TRADE':         return handleWorkerTrade(conv, input, lang);
    case 'W_TOWN':          return handleWorkerTown(conv, text, lang);
    case 'W_PRICE':         return handleWorkerPrice(conv, text, lang);

    case 'CONFIRM_JOB':     return handleConfirmJob(conv, input, lang);
    case 'RATE':            return handleRate(conv, input, lang);

    case 'W_ENTER_CODE':    return handleWorkerCode(conv, text, lang);

    default:
      conv.step = 'MAIN_MENU';
      await conv.save();
      return { replies: [textReply(t(lang, 'unknownInput')), mainMenuReply(lang)] };
  }
}

function mainMenuReply(lang) {
  return buttonsReply(t(lang, 'mainMenu'), [
    { id: 'find_worker', title: t(lang, 'btnFindWorker') },
    { id: 'my_jobs',     title: t(lang, 'btnMyJobs') },
    { id: 'i_am_worker', title: t(lang, 'btnIAmWorker') },
  ]);
}

async function handleMainMenu(conv, input, lang) {
  if (input === 'find_worker') {
    conv.step = 'ASK_TRADE';
    await conv.save();
    return {
      replies: [
        listReply(t(lang, 'askTrade'), TRADES.map((tr) => ({ id: `trade_${tr}`, title: tr.charAt(0).toUpperCase() + tr.slice(1) }))),
      ],
    };
  }

  if (input === 'my_jobs') {
    const user = await User.findOne({ phone: conv.userKey });
    if (!user) {
      return { replies: [textReply('Please register on VouchPass first: ' + CLIENT_URL + '/register')] };
    }
    return { replies: [textReply('View your jobs here: ' + CLIENT_URL + '/my/jobs')] };
  }

  if (input === 'i_am_worker') {
    conv.step = 'W_NAME';
    await conv.save();
    return { replies: [textReply(t(lang, 'workerWelcome')), textReply(t(lang, 'askName'))] };
  }

  return { replies: [mainMenuReply(lang)] };
}

async function handleAskTrade(conv, input, lang) {
  const trade = input.replace('trade_', '');
  if (!TRADES.includes(trade)) {
    return {
      replies: [
        listReply(t(lang, 'askTrade'), TRADES.map((tr) => ({ id: `trade_${tr}`, title: tr.charAt(0).toUpperCase() + tr.slice(1) }))),
      ],
    };
  }
  conv.data.trade = trade;
  conv.step       = 'ASK_LOCATION';
  await conv.save();
  return { replies: [textReply(t(lang, 'askLocation'))] };
}

async function handleAskLocation(conv, input, location, lang) {
  let lat, lng;

  if (location) {
    lat = location.lat;
    lng = location.lng;
  } else {
    // Try to resolve from known towns
    const key  = input.toLowerCase().trim();
    const town = TOWNS[key];
    if (!town) {
      return { replies: [textReply(t(lang, 'askLocation'))] };
    }
    lat = town.lat;
    lng = town.lng;
  }

  conv.data.lat = lat;
  conv.data.lng = lng;
  conv.step     = 'SHOW_RESULTS';
  await conv.save();

  try {
    const results = await findWorkers({ trade: conv.data.trade, lat, lng, maxKm: 25 });
    if (!results.length) {
      conv.step = 'MAIN_MENU';
      await conv.save();
      return { replies: [textReply(t(lang, 'noResults')), mainMenuReply(lang)] };
    }

    conv.data.results = results.slice(0, 3).map((w) => ({
      workerId: w.workerId.toString(),
      name:     w.name,
      trade:    w.trade,
      score:    w.trustScore,
      level:    w.trustLevel,
      distance: w.distanceKm,
    }));
    await conv.save();

    const lines = conv.data.results.map((w, i) =>
      `${i + 1}. ${w.name} - ${w.trade} - Score ${w.score} (${w.level}) - ${w.distance}km away`
    ).join('\n');

    const buttons = conv.data.results.map((_, i) => ({
      id:    `choose_${i}`,
      title: `${t(lang, 'btnChoose')} ${i + 1}`,
    }));

    return {
      replies: [
        textReply(t(lang, 'showResults') + '\n\n' + lines),
        buttonsReply('Pick one:', buttons),
      ],
    };
  } catch (err) {
    console.error('[Bot] findWorkers error:', err.message);
    conv.step = 'MAIN_MENU';
    await conv.save();
    return { replies: [textReply('Could not search workers right now. Try again.'), mainMenuReply(lang)] };
  }
}

async function handleShowResults(conv, input, lang) {
  const idx = parseInt(input.replace('choose_', ''), 10);
  if (isNaN(idx) || !conv.data.results || !conv.data.results[idx]) {
    const buttons = (conv.data.results || []).map((_, i) => ({
      id: `choose_${i}`, title: `${t(lang, 'btnChoose')} ${i + 1}`,
    }));
    return { replies: [buttonsReply('Pick one:', buttons)] };
  }

  conv.data.selectedWorker = conv.data.results[idx];
  conv.step = 'ASK_JOB_DESC';
  await conv.save();

  return {
    replies: [
      textReply(`You chose: ${conv.data.selectedWorker.name}`),
      textReply(`View their Trust Passport: ${CLIENT_URL}/workers/${conv.data.selectedWorker.workerId}`),
      textReply(t(lang, 'askJobDesc')),
    ],
  };
}

async function handleAskJobDesc(conv, text, lang) {
  if (!text || text.trim().length < 3) {
    return { replies: [textReply(t(lang, 'askJobDesc'))] };
  }

  // Create a job request
  const user    = await getOrCreateBotUser(conv.userKey, 'customer');
  const profile = await WorkerProfile.findById(conv.data.selectedWorker.workerId);

  if (!profile) {
    conv.step = 'MAIN_MENU';
    await conv.save();
    return { replies: [textReply('Worker not found. Please try again.'), mainMenuReply(lang)] };
  }

  const job = await Job.create({
    customer:    user._id,
    worker:      profile._id,
    description: text.trim().slice(0, 300),
  });

  conv.data.jobId = job._id.toString();
  conv.step       = 'MAIN_MENU';
  conv.data       = {};
  await conv.save();

  return { replies: [textReply(t(lang, 'jobSent')), mainMenuReply(lang)] };
}

// Worker registration flow
async function handleWorkerName(conv, text, lang) {
  if (!text || text.trim().length < 2) {
    return { replies: [textReply(t(lang, 'askName'))] };
  }
  conv.data.name = text.trim();
  conv.step      = 'W_TRADE';
  await conv.save();
  return {
    replies: [
      listReply(t(lang, 'askWorkerTrade'), TRADES.map((tr) => ({ id: `wtrade_${tr}`, title: tr.charAt(0).toUpperCase() + tr.slice(1) }))),
    ],
  };
}

async function handleWorkerTrade(conv, input, lang) {
  const trade = input.replace('wtrade_', '');
  if (!TRADES.includes(trade)) {
    return {
      replies: [
        listReply(t(lang, 'askWorkerTrade'), TRADES.map((tr) => ({ id: `wtrade_${tr}`, title: tr.charAt(0).toUpperCase() + tr.slice(1) }))),
      ],
    };
  }
  conv.data.trade = trade;
  conv.step       = 'W_TOWN';
  await conv.save();
  return { replies: [textReply(t(lang, 'askTown'))] };
}

async function handleWorkerTown(conv, text, lang) {
  if (!text || text.trim().length < 2) {
    return { replies: [textReply(t(lang, 'askTown'))] };
  }
  conv.data.town = text.trim();
  conv.step      = 'W_PRICE';
  await conv.save();
  return { replies: [textReply(t(lang, 'askPrice'))] };
}

async function handleWorkerPrice(conv, text, lang) {
  // Parse price range e.g. "2000-5000"
  const match  = (text || '').match(/(\d+)\s*[-]\s*(\d+)/);
  const min    = match ? parseInt(match[1]) : 0;
  const max    = match ? parseInt(match[2]) : 0;

  const user   = await getOrCreateBotUser(conv.userKey, 'worker');
  // Update user role and name if needed
  if (user.role !== 'worker') {
    user.role = 'worker';
    await user.save();
  }
  if (conv.data.name && user.name !== conv.data.name) {
    user.name = conv.data.name;
    await user.save();
  }

  const townKey  = (conv.data.town || 'buea').toLowerCase().trim();
  const townData = TOWNS[townKey] || TOWNS.buea;

  let profile = await WorkerProfile.findOne({ user: user._id });
  if (!profile) {
    profile = await WorkerProfile.create({
      user:     user._id,
      trade:    conv.data.trade,
      town:     conv.data.town,
      location: { type: 'Point', coordinates: [townData.lng, townData.lat] },
      priceMin: min,
      priceMax: max,
    });
  }

  conv.step = 'MAIN_MENU';
  conv.data = {};
  await conv.save();

  const link = `${CLIENT_URL}/workers/${profile._id}`;
  return {
    replies: [
      textReply(t(lang, 'workerDone', { link })),
      mainMenuReply(lang),
    ],
  };
}

async function handleConfirmJob(conv, input, lang) {
  if (input === 'confirm_yes') {
    conv.step = 'RATE';
    await conv.save();
    return {
      replies: [
        listReply(t(lang, 'ratePrompt'), [
          { id: 'rate_1', title: '1 - Poor' },
          { id: 'rate_2', title: '2 - Fair' },
          { id: 'rate_3', title: '3 - Good' },
          { id: 'rate_4', title: '4 - Very Good' },
          { id: 'rate_5', title: '5 - Excellent' },
        ]),
      ],
    };
  }
  conv.step = 'MAIN_MENU';
  await conv.save();
  return { replies: [mainMenuReply(lang)] };
}

async function handleRate(conv, input, lang) {
  const rating = parseInt(input.replace('rate_', ''), 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { replies: [listReply(t(lang, 'ratePrompt'), [1,2,3,4,5].map((n) => ({ id: `rate_${n}`, title: String(n) })))] };
  }

  if (conv.data.jobId) {
    const job = await Job.findById(conv.data.jobId);
    if (job && job.status === 'in_progress') {
      job.status      = 'confirmed';
      job.confirmedAt = new Date();
      job.rating      = rating;
      await job.save();

      const { counted } = await shouldCountJob(job._id);
      job.countedForScore = counted;
      await job.save();

      await recalculateWorker(job.worker.toString(), 'bot job confirmed');
    }
  }

  conv.step = 'MAIN_MENU';
  conv.data = {};
  await conv.save();

  return { replies: [textReply(t(lang, 'thankYou')), mainMenuReply(lang)] };
}

async function handleWorkerCode(conv, text, lang) {
  const code = (text || '').trim();
  if (!conv.data.jobId) {
    conv.step = 'MAIN_MENU';
    await conv.save();
    return { replies: [mainMenuReply(lang)] };
  }

  const job = await Job.findById(conv.data.jobId).select('+code');
  if (!job || job.status !== 'accepted') {
    conv.step = 'MAIN_MENU';
    await conv.save();
    return { replies: [textReply('Job not found or already started.'), mainMenuReply(lang)] };
  }

  if (job.lockedUntil && job.lockedUntil > new Date()) {
    return { replies: [textReply(t(lang, 'codeLocked'))] };
  }

  if (code !== job.code) {
    job.codeAttempts += 1;
    if (job.codeAttempts >= 5) {
      job.lockedUntil  = new Date(Date.now() + 15 * 60 * 1000);
      job.codeAttempts = 0;
      await job.save();
      return { replies: [textReply(t(lang, 'codeLocked'))] };
    }
    await job.save();
    return { replies: [textReply(t(lang, 'codeWrong', { remaining: 5 - job.codeAttempts }))] };
  }

  job.status    = 'in_progress';
  job.startedAt = new Date();
  job.codeAttempts = 0;
  await job.save();

  conv.step = 'MAIN_MENU';
  conv.data = {};
  await conv.save();

  return { replies: [textReply(t(lang, 'jobStarted')), mainMenuReply(lang)] };
}

module.exports = { handleMessage };
