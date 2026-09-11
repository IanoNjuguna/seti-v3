# seti-v3

seti.live is a payment orchestration system that lets users send mobile-money payments through WhatsApp using on-chain USDC/EURC balances. It combines conversational intent parsing with a backend-controlled ledger, policy engine, state machine, DEX routing, and offramp infrastructure for fiat settlement.

The conversational agent acts strictly as a controlled interface: it parses payment requests, validates recipients, presents backend-generated quotes, and collects explicit transaction confirmations. All financial operations and state changes are handled by the deterministic backend.

## Architecture

**WhatsApp Interface** — Natural-language payment requests and transaction updates.

**Conversational Agent** — Intent parsing, quote presentation, and confirmation handling.

**Recipient Validation** — Validates mobile-money recipients before quoting.

**Quote & Policy Engine** — Handles FX rates, fees, limits, quote expiry, and authorization.

**Ledger** — Tracks financial state and maintains balanced per-asset journals.

**DEX Routing** — Converts supported stablecoins into the settlement asset.

**Settlement** — Transfers settlement funds to Pretium (offramp).

**Offramp** — Verifies the on-chain transfer and releases fiat to the recipient

**State Machine** — Tracks every transaction through settlement states.

**Saga Compensation** — Handles failures and automatic refunds.

**Reconciliation** — Resolves ambiguous onchain or offramp states through polling and webhooks.

## Transaction Flow

```
WhatsApp
   ↓
Intent Parsing
   ↓
Recipient Validation
   ↓
Quote Generation
   ↓
Explicit Confirmation
   ↓
Policy Reservation
   ↓
DEX Swap
   ↓
On-Chain Settlement
   ↓
Pretium Verification
   ↓
Mobile Money Payout
   ↓
Ledger Reconciliation
```

The system distinguishes on-chain settlement confirmation from successful fiat payout. Users are only told a payment is complete after final payout verification.

## Project Structure

```
seti-v3/
├── apps/
│   ├── api/                 # Fastify backend — ledger, state machine, adapters
│   └── web/                 # Next.js — landing page and admin dashboard
├── packages/
│   └── shared/              # Zod schemas and TypeScript types
├── docs/
│   ├── wireframe.md
│   ├── prd.md
│   ├── onboarding.md
│   └── design-system.html
└── .agents/skills/          # Project-specific agent skills
```

## How to Run

### Prerequisites

- [Bun](https://bun.sh/) 1.0 or later
- PostgreSQL 14+
- Redis 7+ (for background jobs — optional for basic prototype)

### 1. Install dependencies

```bash
bun install
```

### 2. Set up the database

Copy the example environment file and update `DATABASE_URL`:

```bash
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env
```

Create the database and run migrations:

```bash
createdb seti
bun run db:migrate
```

Seed the prototype user:

```bash
bun run --cwd apps/api db:seed
```

### 3. Build the shared package

```bash
bun run --cwd packages/shared build
```

### 4. Run the API

```bash
bun run --cwd apps/api dev
```

The API will be available at `http://localhost:3001`.

Key routes:

- `POST /api/v1/quotes` — create a quote
- `POST /api/v1/quotes/confirm` — confirm and execute a transfer
- `GET /api/v1/transactions?userId=...` — list transactions
- `POST /api/v1/webhooks/whatsapp` — WhatsApp webhook receiver
- `GET /api/v1/webhooks/whatsapp` — WhatsApp webhook verification

### 5. Run the Web App

In another terminal:

```bash
bun run --cwd apps/web dev
```

The web app will be available at `http://localhost:3000`.

- `/` — landing page
- `/admin` — prototype transaction monitor

### 6. Test the WhatsApp flow locally

Since the prototype does not connect to Meta's live API by default, you can simulate a webhook:

```bash
curl -X POST http://localhost:3001/api/v1/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "254722111222",
            "id": "msg_1",
            "type": "text",
            "text": { "body": "Send KES 500 to 0722111222" },
            "timestamp": "1700000000"
          }]
        }
      }]
    }]
  }'
```

Then confirm the returned quote:

```bash
curl -X POST http://localhost:3001/api/v1/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "254722111222",
            "id": "msg_2",
            "type": "text",
            "text": { "body": "CONFIRM QT-XXXX nonce_YYYY" },
            "timestamp": "1700000001"
          }]
        }
      }]
    }]
  }'
```

## Status

Under development. External integrations (Pretium, on-chain RPC, Meta WhatsApp Cloud API) are stubbed behind adapter interfaces so real implementations can be swapped in without changing core business logic.
