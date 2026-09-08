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

Status: 🚧 Under development
