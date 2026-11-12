/**
 * Seed script for VouchPass demo data.
 * Deterministic and re-runnable: clears existing data, then recreates everything.
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User          = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const Job           = require('../models/Job');
const Vouch         = require('../models/Vouch');
const SkillCheck    = require('../models/SkillCheck');
const AuditLog      = require('../models/AuditLog');
const { recalculateWorker } = require('../services/trustScore');
const TOWNS = require('../config/towns');

const PASS = 'demo1234';

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    WorkerProfile.deleteMany({}),
    Job.deleteMany({}),
    Vouch.deleteMany({}),
    SkillCheck.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  console.log('Collections cleared');

  // ---- Admin ----
  const admin = await User.create({ name: 'Admin VouchPass', email: 'admin@vouchpass.cm', phone: '+237700000001', password: PASS, role: 'admin', phoneVerified: true, createdAt: daysAgo(200) });

  // ---- Verifiers ----
  const verifier1 = await User.create({ name: 'Pa Tabi', phone: '+237700000010', password: PASS, role: 'verifier', phoneVerified: true, createdAt: daysAgo(180) });
  const verifier2 = await User.create({ name: 'Mama Ngu', phone: '+237700000011', password: PASS, role: 'verifier', phoneVerified: true, createdAt: daysAgo(160) });
  const verifier3 = await User.create({ name: 'Engineer Bate', phone: '+237700000012', password: PASS, role: 'verifier', phoneVerified: true, createdAt: daysAgo(140) });

  // Verifiers also have worker profiles with a starting score
  const v1profile = await WorkerProfile.create({ user: verifier1._id, trade: 'mechanic',    town: 'Buea',   location: { type: 'Point', coordinates: [TOWNS.buea.lng, TOWNS.buea.lat] },   priceMin: 5000, priceMax: 15000, trustScore: 60, trustLevel: 'Trusted', createdAt: daysAgo(180) });
  const v2profile = await WorkerProfile.create({ user: verifier2._id, trade: 'tailor',      town: 'Limbe',  location: { type: 'Point', coordinates: [TOWNS.limbe.lng, TOWNS.limbe.lat] }, priceMin: 3000, priceMax: 8000,  trustScore: 60, trustLevel: 'Trusted', createdAt: daysAgo(160) });
  const v3profile = await WorkerProfile.create({ user: verifier3._id, trade: 'electrician', town: 'Douala', location: { type: 'Point', coordinates: [TOWNS.douala.lng, TOWNS.douala.lat] }, priceMin: 7000, priceMax: 20000, trustScore: 70, trustLevel: 'Trusted', createdAt: daysAgo(140) });

  // ---- Customers ----
  const cust1 = await User.create({ name: 'Fon Peter',    phone: '+237700000020', password: PASS, role: 'customer', phoneVerified: true, createdAt: daysAgo(100) });
  const cust2 = await User.create({ name: 'Nkeng Grace',  phone: '+237700000021', password: PASS, role: 'customer', phoneVerified: true, createdAt: daysAgo(90) });
  const cust3 = await User.create({ name: 'Tita Alain',   phone: '+237700000022', password: PASS, role: 'customer', phoneVerified: true, createdAt: daysAgo(80) });
  const cust4 = await User.create({ name: 'Bih Sandra',   phone: '+237700000023', password: PASS, role: 'customer', phoneVerified: true, createdAt: daysAgo(60) });

  // ---- Workers: 14 across trades and towns ----
  const workersData = [
    // Highly Trusted (score ~80)
    { name: 'Che Francis',  phone: '+237700000030', trade: 'electrician', town: 'Buea',   townKey: 'buea',   priceMin: 5000,  priceMax: 15000, daysOld: 200 },
    // Trusted
    { name: 'Mbi Daniel',   phone: '+237700000031', trade: 'plumber',     town: 'Limbe',  townKey: 'limbe',  priceMin: 3000,  priceMax: 10000, daysOld: 150 },
    { name: 'Tabe Alice',   phone: '+237700000032', trade: 'tailor',      town: 'Molyko', townKey: 'molyko', priceMin: 2000,  priceMax: 6000,  daysOld: 120 },
    { name: 'Fru Emmanuel', phone: '+237700000033', trade: 'carpenter',   town: 'Tiko',   townKey: 'tiko',   priceMin: 8000,  priceMax: 25000, daysOld: 180 },
    // Rising
    { name: 'Nfor Comfort', phone: '+237700000034', trade: 'hairdresser', town: 'Buea',   townKey: 'buea',   priceMin: 1500,  priceMax: 4000,  daysOld: 60 },
    { name: 'Tanyi Gerald', phone: '+237700000035', trade: 'mechanic',    town: 'Limbe',  townKey: 'limbe',  priceMin: 10000, priceMax: 30000, daysOld: 50 },
    { name: 'Ako Beatrice', phone: '+237700000036', trade: 'mason',       town: 'Molyko', townKey: 'molyko', priceMin: 15000, priceMax: 40000, daysOld: 70 },
    { name: 'Mbah Samuel',  phone: '+237700000037', trade: 'plumber',     town: 'Tiko',   townKey: 'tiko',   priceMin: 3500,  priceMax: 9000,  daysOld: 45 },
    // New
    { name: 'Yong Victor',  phone: '+237700000038', trade: 'electrician', town: 'Buea',   townKey: 'buea',   priceMin: 2000,  priceMax: 7000,  daysOld: 10 },
    { name: 'Muna Stella',  phone: '+237700000039', trade: 'tailor',      town: 'Limbe',  townKey: 'limbe',  priceMin: 1500,  priceMax: 4500,  daysOld: 5 },
    { name: 'Amos Fon',     phone: '+237700000040', trade: 'carpenter',   town: 'Douala', townKey: 'douala', priceMin: 6000,  priceMax: 18000, daysOld: 8 },
    { name: 'Lum Patience', phone: '+237700000041', trade: 'hairdresser', town: 'Tiko',   townKey: 'tiko',   priceMin: 1000,  priceMax: 3500,  daysOld: 3 },
    // Extra for coverage
    { name: 'Njie Marcus',  phone: '+237700000042', trade: 'mason',       town: 'Buea',   townKey: 'buea',   priceMin: 12000, priceMax: 35000, daysOld: 100 },
    // Brand new electrician in Molyko with score 0 for the live vouch moment
    { name: 'Bongfen Elias', phone: '+237700000043', trade: 'electrician', town: 'Molyko', townKey: 'molyko', priceMin: 2500, priceMax: 8000, daysOld: 1 },
  ];

  const workerUsers    = [];
  const workerProfiles = [];

  for (const w of workersData) {
    const user = await User.create({
      name:  w.name,
      phone: w.phone,
      password: PASS,
      role:  'worker',
      phoneVerified: true,
      createdAt: daysAgo(w.daysOld),
    });
    const profile = await WorkerProfile.create({
      user:     user._id,
      trade:    w.trade,
      town:     w.town,
      location: { type: 'Point', coordinates: [TOWNS[w.townKey].lng, TOWNS[w.townKey].lat] },
      priceMin: w.priceMin,
      priceMax: w.priceMax,
      createdAt: daysAgo(w.daysOld),
    });
    workerUsers.push(user);
    workerProfiles.push(profile);
  }

  // ---- Jobs: ~20 confirmed jobs with ratings ----
  // Worker indices: 0=CheF(electrician), 1=MbiD(plumber), 2=TabeA(tailor), 3=FruE(carpenter),
  //                 4=NforC(hair), 5=TanyiG(mechanic), 6=AkoBe(mason), 7=MbahS(plumber),
  //                 8=YongV(electrician/new), 9=MunaS(tailor/new), ...12=NjieMarcus, 13=BongElias(new)
  const customers = [cust1, cust2, cust3, cust4];

  async function makeJob(custIdx, workerIdx, daysAgoN, rating, description) {
    const job = await Job.create({
      customer:    customers[custIdx]._id,
      worker:      workerProfiles[workerIdx]._id,
      description,
      status:      'confirmed',
      code:        '0000',
      confirmedAt: daysAgo(daysAgoN),
      countedForScore: true,
      rating,
      acceptedAt:  daysAgo(daysAgoN + 1),
      startedAt:   daysAgo(daysAgoN),
      createdAt:   daysAgo(daysAgoN + 1),
    });
    return job;
  }

  // Che Francis (highly trusted) - 10 counted fresh jobs
  for (let i = 0; i < 10; i++) {
    const cIdx = i % customers.length;
    if (cIdx === 0 && i > 0 && i < 7) {
      // Skip duplicate for counting - but still create for realism
      await Job.create({ customer: customers[0]._id, worker: workerProfiles[0]._id, description: `Electrical job ${i+1}`, status: 'confirmed', code: '0000', confirmedAt: daysAgo(5), countedForScore: false, rating: 4, acceptedAt: daysAgo(6), startedAt: daysAgo(5), createdAt: daysAgo(6) });
    } else {
      await makeJob(cIdx, 0, 20 + i * 10, 5, `Electrical wiring job ${i+1}`);
    }
  }

  // Mbi Daniel (plumber)
  await makeJob(0, 1, 30, 4, 'Fix bathroom pipes');
  await makeJob(1, 1, 60, 5, 'Install water heater');
  await makeJob(2, 1, 90, 4, 'Fix kitchen sink');

  // Tabe Alice (tailor)
  await makeJob(0, 2, 15, 5, 'Sew traditional wear');
  await makeJob(1, 2, 45, 4, 'Repair school uniform');

  // Fru Emmanuel (carpenter)
  await makeJob(0, 3, 10, 5, 'Build kitchen cabinet');
  await makeJob(1, 3, 40, 5, 'Repair wooden door');

  // Nfor Comfort (hairdresser, rising)
  await makeJob(2, 4, 20, 4, 'Natural hair styling');
  await makeJob(3, 4, 35, 3, 'Hair braiding');

  // Tanyi Gerald (mechanic, rising)
  await makeJob(0, 5, 10, 5, 'Engine diagnosis');

  // Ako Beatrice (mason, rising)
  await makeJob(1, 6, 25, 4, 'Plaster living room');

  // ---- Vouches ----
  // Pa Tabi (verifier, mechanic, score 60) vouches for Che Francis
  const v1 = await Vouch.create({ fromUser: verifier1._id, toWorker: workerProfiles[0]._id, comment: 'Excellent electrician, very reliable', createdAt: daysAgo(50) });

  // Mama Ngu vouches for Tabe Alice
  await Vouch.create({ fromUser: verifier2._id, toWorker: workerProfiles[2]._id, comment: 'Talented tailor, always on time', createdAt: daysAgo(40) });

  // Engineer Bate vouches for Mbi Daniel (score 70)
  await Vouch.create({ fromUser: verifier3._id, toWorker: workerProfiles[1]._id, comment: 'Solid plumber, good workmanship', createdAt: daysAgo(45) });

  // Reciprocal vouch: Che Francis vouches back for Pa Tabi's worker profile
  await Vouch.create({ fromUser: workerUsers[0]._id, toWorker: v1profile._id, comment: 'He helped me get started', createdAt: daysAgo(30) });

  // Pa Tabi vouches for Yong Victor (new electrician, score 0 - this is the live demo moment)
  // We do NOT create this in seed - it is done live during the demo pitch

  // ---- Skill Checks ----
  await SkillCheck.create({ worker: workerProfiles[0]._id, verifier: verifier3._id, trade: 'electrician', skill: 'Solar installation', createdAt: daysAgo(30) });
  await SkillCheck.create({ worker: workerProfiles[0]._id, verifier: verifier1._id, trade: 'electrician', skill: 'Three-phase wiring', createdAt: daysAgo(20) });
  await SkillCheck.create({ worker: workerProfiles[2]._id, verifier: verifier2._id, trade: 'tailor',      skill: 'Traditional embroidery', createdAt: daysAgo(15) });
  await SkillCheck.create({ worker: workerProfiles[1]._id, verifier: verifier3._id, trade: 'plumber',     skill: 'PVC pipe fitting', createdAt: daysAgo(25) });

  // ---- Recalculate trust scores for all profiles ----
  console.log('Recalculating trust scores...');
  for (const p of workerProfiles) {
    await recalculateWorker(p._id.toString(), 'seed');
  }
  for (const vp of [v1profile, v2profile, v3profile]) {
    await recalculateWorker(vp._id.toString(), 'seed');
  }

  console.log('\n========================================');
  console.log('DEMO LOGIN CREDENTIALS (password: demo1234)');
  console.log('========================================');
  console.log('Admin:       phone +237700000001');
  console.log('Verifiers:   Pa Tabi +237700000010 | Mama Ngu +237700000011 | Engineer Bate +237700000012');
  console.log('Customers:   Fon Peter +237700000020 | Nkeng Grace +237700000021 | Tita Alain +237700000022 | Bih Sandra +237700000023');
  console.log('Workers:     Che Francis +237700000030 (electrician, Buea - should be Trusted+)');
  console.log('             Mbi Daniel +237700000031 (plumber, Limbe)');
  console.log('             Yong Victor +237700000038 (electrician, Buea - New, low score)');
  console.log('             Bongfen Elias +237700000043 (electrician, Molyko - Score 0, demo vouch moment)');
  console.log('========================================\n');

  await mongoose.disconnect();
  console.log('Seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
