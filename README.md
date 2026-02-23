# DewBox (MyDewbox)

Full-stack contribution and wallet platform with Piggy and ICA contribution flows, payment integration, and transaction history.

## Features

- User authentication with JWT.
- Wallet funding, withdrawals, and transfers.
- Contribution flows for Piggy and ICA.
- Contribution mode support (`auto` and `all_ica`).
- Contribution and transaction history tracking.
- Paystack payment initialization and verification for supported flows.
- Responsive frontend built with React and Tailwind CSS.

## Tech Stack

### Frontend (`Client/MyDewbox`)

- React + Vite
- Tailwind CSS
- Framer Motion
- TanStack Query
- Axios

### Backend (`Server/mdbx-backend`)

- Node.js + Express
- MySQL (`mysql2`)
- JWT (`jsonwebtoken`)
- Bcrypt
- Express middleware (`helmet`, `cors`, `express-rate-limit`)

## Repository Structure

```text
DewBox/
  Client/MyDewbox/        # Frontend app
  Server/mdbx-backend/    # Backend API
  README.md
```

## Prerequisites

- Node.js 18+
- npm
- MySQL 8+ (or compatible hosted MySQL)
- Paystack account (for payment-enabled flows)

## Setup

### 1. Install dependencies

```bash
# frontend
cd Client/MyDewbox
npm install

# backend
cd ../../Server/mdbx-backend
npm install
```

### 2. Configure environment variables

Copy and edit these files:

- `Client/MyDewbox/.env.example` -> `Client/MyDewbox/.env` (or `.env.development` / `.env.production`)
- `Server/mdbx-backend/.env.example` -> `Server/mdbx-backend/.env`

### 3. Run the app

In two terminals:

```bash
# terminal 1 (backend)
cd Server/mdbx-backend
npm run dev
```

```bash
# terminal 2 (frontend)
cd Client/MyDewbox
npm run dev
```

Frontend default: `http://localhost:5173`  
Backend default: `http://localhost:4000`

## Environment Variables

### Frontend

Defined in `Client/MyDewbox/.env.example`:

- `VITE_API_URL` - backend API base URL.
- `VITE_PAYSTACK_PUBLIC_KEY` - Paystack public key used by contribution payment flow.
- `VITE_HMR_HOST` (optional) - custom HMR host for LAN/dev networking.

### Backend

Defined in `Server/mdbx-backend/.env.example`:

- `PORT` - API port (default `4000`).
- `NODE_ENV` - `development` or `production`.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - database config.
- `JWT_SECRET` - required JWT signing secret.
- `JWT_EXPIRES_IN` - token lifetime.
- `PAYSTACK_SECRET_KEY` - Paystack secret key for server-side verification.
- `FRONTEND_URL` - frontend URL used in callbacks and CORS settings.
- `ADMIN_USER_ID` - admin user id used in ICA routing logic.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (optional).

## Payment Provider

Paystack is integrated in both frontend and backend flows for payment initialization and verification.  
Set valid Paystack keys before testing card/bank payment flows.

## Notes

- This repo contains multiple legacy scripts and docs under `Server/mdbx-backend/scripts` and related files; core app runtime does not require running all of them.
- API behavior and routes are implemented under `Server/mdbx-backend/src/routes`.

## License

No root open-source license file is currently included.  
Backend package metadata is marked as `UNLICENSED`.
