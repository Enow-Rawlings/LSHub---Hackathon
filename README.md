# VouchPass

A community-verified trust and reputation system for informal blue-collar workers in Cameroon.

## What it does

VouchPass gives every informal worker (electrician, plumber, tailor, mechanic, mason, hairdresser, carpenter) a public **Trust Passport** with a score from 0-100 built from:
- Confirmed jobs (with 4-digit verification codes)
- Community vouches from respected verifiers
- Verified skills signed off by verifiers
- Customer ratings and consistency

## Run locally

### Server
```bash
cd server
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run seed           # populate demo data
npm run dev            # starts on port 5000
```

### Client
```bash
cd client
cp .env.example .env   # set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev            # starts on port 5173
```

## Environment variables

### Server
| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (default 7d) |
| `CLIENT_URL` | Frontend URL for CORS |
| `VERIFIER_INVITE_CODE` | Code required to register as a verifier |
| `NODE_ENV` | `development` or `production` |

### Client
| Variable | Description |
|---|---|
| `VITE_API_URL` | Full API URL e.g. `https://yourapp.onrender.com/api` |

## Demo credentials (password: demo1234)

| Role | Name | Phone |
|---|---|---|
| Admin | Admin VouchPass | +237700000001 |
| Verifier | Pa Tabi | +237700000010 |
| Verifier | Mama Ngu | +237700000011 |
| Verifier | Engineer Bate | +237700000012 |
| Customer | Fon Peter | +237700000020 |
| Customer | Nkeng Grace | +237700000021 |
| Worker (Trusted) | Che Francis | +237700000030 |
| Worker (New) | Yong Victor | +237700000038 |
| Worker (Score 0, demo) | Bongfen Elias | +237700000043 |

## Demo script

1. Open `/find`, search for **electrician** in **Molyko** - see workers ranked by trust
2. Register as a customer, request a job from a worker
3. Log in as that worker, accept the job - customer sees a 4-digit code
4. Worker enters the code to start the job
5. Customer confirms and rates - score updates live
6. Log in as Pa Tabi (verifier), vouch for Bongfen Elias - score increases
7. Open `/workers/:id` - Trust Passport with QR code, no login required

## Architecture

- **Server**: Express + Mongoose on Node.js, deployed on Render
- **Client**: React + Vite + Tailwind CSS, deployed on Vercel
- **Database**: MongoDB Atlas with 2dsphere geo index for location search
- **Trust Score**: Pure function engine, unit tested with node:test
- **Bot**: Channel-independent engine, web simulator on `/chat`
- **Auth**: JWT in Authorization header, bcrypt cost 10, 7-day expiry
- **Security**: helmet, CORS, rate limiting, Zod input validation, ownership checks

## Deployment

- **Render**: connect repo, set env vars, build `npm install`, start `node server.js`
- **Vercel**: connect `/client` folder, set `VITE_API_URL`, auto-deploys
- **Atlas**: whitelist 0.0.0.0/0 for hackathon
