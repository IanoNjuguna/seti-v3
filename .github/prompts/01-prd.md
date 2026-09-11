# Seti — Product Requirements Document

---

## 1. Summary

Seti lets a user send money to a mobile money recipient (starting with M-Pesa
in Kenya) by texting a plain-language instruction to a WhatsApp number. The
transfer is funded from the user's on-chain stablecoin balance (EURC/USDC),
swapped on-chain as needed, settled to Pretium's offramp settlement address,
and disbursed as fiat by Pretium. The product surface is a WhatsApp
conversation; the hard problem is making that conversation trustworthy given
that it sits on top of three independently-unreliable systems: a messaging
platform, a blockchain, and a payments provider.

## 2. Problem Statement

Sending money into Kenyan mobile money from a stablecoin balance today
requires the sender to understand exchange onramps, hold the right asset on
the right chain, and manually track a multi-step settlement process. Seti
collapses this into a single WhatsApp conversation: state an amount and a
recipient, confirm a quote, get notified when it lands. The product succeeds
if a non-technical user can do this with the same confidence as a native
M-Pesa transfer — including confidence that a delayed or failed step will
never result in a silent loss of funds, a double charge, or a payout the user
can't get a straight answer about.

## 3. Goals

- Let a user complete a cross-border-to-mobile-money transfer entirely inside
  a WhatsApp conversation, with no separate app or wallet UI required.
- Guarantee, structurally (not just by convention), that a transfer cannot be
  executed twice from a single user confirmation.
- Guarantee that every quoted number the user approves is the number that
  actually gets executed, with no silent re-pricing.
- Ensure that any transfer which fails partway is either automatically
  refunded or explicitly escalated to a human — never left in a state where
  neither the user nor the system can tell what happened.
- Keep the user informed with accurate, non-misleading status at every stage,
  without ever claiming completion before Pretium has actually confirmed
  payout.

## 4. Non-Goals (v1)

- Multi-country / multi-rail expansion beyond M-Pesa mobile money in Kenya.
- Support for payout rails other than mobile money (paybill, till, bank) —
  parsed and validated for later, not built for v1.
- In-chat wallet funding (topping up the user's on-chain balance) — assumed
  to happen outside Seti in v1.
- A web or app UI. WhatsApp is the only surface.
- Support for asset swaps beyond the EURC/USDC → Pretium-accepted-asset path
  already scoped.

## 5. Users

- **Primary:** Someone holding stablecoins who wants to pay a person or
  business in Kenya via mobile money, without manually bridging/converting
  themselves.
- **Secondary (implicit):** The mobile money recipient, who never interacts
  with Seti directly — they just receive a standard mobile money credit.
- **Internal:** An operations/support role who handles `MANUAL_REVIEW`
  escalations.

## 6. Functional Requirements

Each requirement below maps to a flow already specified in the conversational
wireframe.

### 6.1 Recipient validation

The system must validate a recipient identifier against Pretium's
`/v1/validation` endpoint before a quote can be generated. A quote must never
be built against an unvalidated recipient. *(Wireframe Flow 3)*

### 6.2 Quote generation

Given a validated recipient, an amount, and a currency, the system must
generate a quote showing: transfer amount in minor units, locked FX rate,
net FX output, swap route, settlement chain, max slippage input, total wallet
debit, and an explicit expiry. All figures must originate from backend
calculation / Pretium's rate endpoint — never estimated by the conversational
layer. *(Wireframe Flow 1)*

### 6.3 Confirmation & idempotent execution

A transfer must only execute after the user replies with both the quote ID
and the exact nonce issued with that quote. A repeated confirmation with the
same quote/nonce (or the same underlying on-chain `transaction_hash`
submitted to Pretium) must return the cached result of the original
execution and must not re-swap, re-transfer, or re-disburse funds.
*(Wireframe Flow 2)*

### 6.4 Quote expiry enforcement

A confirmation received after a quote's expiry must be rejected with a clear
explanation, and must never execute at a stale rate. *(Wireframe Flow 4)*

### 6.5 Policy / spend limits

The system must enforce a rolling daily spend limit per user, reject
transfers that would exceed it, and tell the user their current usage and
reset time rather than a bare rejection. *(Wireframe Flow 5)*

**Decision (v1):** limits are tiered by KYC/verification level rather than a
single flat global cap — a more-verified user gets a higher daily allowance.
This means the policy engine's limit lookup must key off the user's current
verification tier (`users.is_personhood_verified` and any future tier field)
rather than a single hardcoded constant, and the tier→limit mapping needs to
be configurable, not baked into `policyEngine.js` as a literal. Open
implementation questions for the engineering team, not blocked on any
external dependency: how many tiers, what triggers a tier upgrade, and
whether a user mid-transaction who is upgraded should have the new limit
apply retroactively to that day's window or only going forward.

### 6.6 Multi-stage status visibility

The system must track and be able to report each discrete stage of a
transfer's lifecycle — swap, on-chain settlement transfer, settlement
confirmation, Pretium payout verification, payout completion — and must only
report "confirmed" or "complete" to the user once Pretium's final status (via
poll or webhook) confirms it. Intermediate confirmations (e.g. an on-chain
transfer confirming) must be communicated as progress, not completion.
*(Wireframe Flow 6, System Prompt §Status and error relaying)*

### 6.7 Automatic compensation on irrecoverable failure

If a transfer fails after funds have already moved on-chain but before the
fiat payout completes, the system must automatically reverse the position
and refund the user's wallet without requiring user action, and must clearly
communicate that this happened. *(Wireframe Flow 7)*

### 6.8 Manual review escalation

If a transfer's final state cannot be automatically determined (ambiguous or
timed-out provider response), the system must escalate it to manual review,
tell the user their funds are safe, and give a response time commitment —
rather than leaving the transaction silently stuck. *(Wireframe Flow 8)*

### 6.9 Ambiguous input handling

The conversational layer must ask for clarification rather than guess when a
recipient, amount, or currency is ambiguous or unresolvable from a saved
contact. *(Wireframe Flow 9)*

## 7. Non-Functional Requirements

### 7.1 Financial integrity

- Every monetary movement must be recorded as a balanced double-entry ledger
  journal, enforced at the database level (not application code alone), and
  grouped per asset so cross-currency legs cannot numerically offset each
  other.
- Ledger entries must be immutable; corrections happen only via new
  reversing entries.

### 7.2 Idempotency

- Every external operation (swap execution, settlement transfer, Pretium
  `/pay` call) must be keyed by a deterministic idempotency key and/or
  on-chain transaction hash, such that a retried request with identical
  parameters is a no-op returning the original result, and a retried request
  with different parameters is rejected outright.

### 7.3 Never submit unconfirmed on-chain state to a third party

The system must independently confirm the settlement transfer on-chain
before calling Pretium's `/pay` endpoint with its transaction hash. A hash
must never be submitted before the system itself has verified it landed and
is not at meaningful risk of a reorg.

### 7.4 Verification must not depend solely on webhooks

Pretium status webhooks must be treated as a latency optimization, not the
source of truth. A background process must independently poll
`/v1/status/{currency_code}` so a missed or delayed webhook cannot strand a
transaction in an unresolved state.

### 7.5 Conversational agent boundaries

The WhatsApp-facing agent must never compute, estimate, or alter a monetary
value, and must never expose internal state names, raw provider error codes,
or system architecture details to the user. All financial logic lives in the
deterministic backend; the agent only relays backend output. *(System Prompt,
in full)*

### 7.6 Privacy

Recipient phone numbers must never be displayed back to the user (or logged)
in a raw format where a lookup token would normally be used; identity
resolution and encrypted storage must be structurally separated.

### 7.7 Availability of human escalation

Any transaction that cannot be automatically resolved within a defined SLA
must surface to a human reviewer, not remain indefinitely in an ambiguous
automated state.

## 8. Dependencies

- **Pretium API** — recipient validation, exchange rate/quote, on-chain
  settlement verification (`/pay`), payout status (poll + webhook). Confirmed
  supported settlement chains: BASE, CELO (default), STELLAR, POLYGON,
  SOLANA, ETHEREUM, BNB, AVALANCHE, ARBITRUM — chain is configurable per
  deployment, not fixed to Celo (see §11.1).
- **Meta WhatsApp Business Cloud API** — message ingestion and delivery.
- **DEX liquidity (Uniswap V3 or an aggregator)** — for swapping the user's
  held asset into whatever Pretium's settlement address accepts.
- **On-chain RPC access** — for broadcasting and confirming the settlement
  transfer.
- **PostgreSQL** — ledger, state machine, and idempotency store, with
  support for `SERIALIZABLE` isolation and deferred constraint triggers.

## 9. Success Metrics

- **Correctness (must be zero, not "low"):** count of double-executed
  transfers; count of unbalanced ledger journals ever committed.
- **Resolution time:** median and p95 time from confirmation to user-visible
  "payment complete."
- **Escalation rate:** % of transactions that land in `MANUAL_REVIEW`;
  target trending down as reconciliation logic matures.
- **User-facing accuracy:** zero instances of the bot reporting "complete"
  before Pretium's final status actually confirmed it.
- **Refund reliability:** 100% of `SAGA_COMPENSATING` transactions resolve to
  either `SAGA_COMPENSATED` or `MANUAL_REVIEW` within a defined SLA — never
  silently abandoned.

## 10. Risks

- **Reorg risk on the settlement transfer** — submitting a `transaction_hash`
  to Pretium before it's safely confirmed could reference a transfer that
  later doesn't exist on-chain. Mitigated by 7.3.
- **Provider ambiguity (Pretium or chain RPC)** — timeouts and 5xx responses
  are indistinguishable from "it happened but we didn't hear back." Mitigated
  by explicit `*_UNKNOWN` states and the reconciliation poll (7.4).
- **Rate volatility between quote and execution** — mitigated by short quote
  expiry and Pretium rate locks, but worth monitoring actual slippage
  incidence once live.
- **WhatsApp session/template constraints** — Meta's messaging window rules
  may limit the bot's ability to proactively notify a user of a delayed
  settlement outside a 24-hour session; needs a fallback (e.g., an approved
  message template) for late-resolving `MANUAL_REVIEW` cases.

## 11. Resolved Questions

### 11.1 Which chains does Pretium's settlement address accept?

Resolved. Pretium's offramp `/v1/pay/{currency_code}` endpoint accepts a
`chain` field with nine supported networks: **BASE, CELO (default), STELLAR,
POLYGON, SOLANA, ETHEREUM, BNB, AVALANCHE, ARBITRUM**. This is not fixed per
corridor — the `chain` parameter is passed per-request, so in principle any
supported chain can be used for a KES payout, not just Celo. The wireframe's
choice of Celo as the settlement chain is consistent with Pretium's stated
default, but the system should treat this as configurable, not hardcoded —
the DEX swap step needs to target whichever chain/asset combination is
actually configured for a given deployment, and that choice should live in
config, not be assumed. **Action:** confirm with Pretium whether KES payouts
specifically have a preferred/lower-fee chain before defaulting to Celo in
production.

### 11.2 Does Pretium support a native idempotency key on `/v1/pay`?

Partially resolved. Pretium's documented `/pay` flow does not show a
dedicated `Idempotency-Key` header in the public docs — the natural
dedup key on their side is the on-chain `transaction_hash` itself, since
`/pay` is explicitly described as verifying that a specific on-chain payment
happened before releasing fiat against it. This is actually a reasonable
idempotency anchor: a given `transaction_hash` can only correspond to one
real transfer, so re-submitting the same hash should be safe to treat as a
duplicate on Seti's side regardless of whether Pretium separately
deduplicates it. **Recommendation:** don't rely on Pretium silently
deduplicating a resubmitted `transaction_hash` — Seti's own
`external_operations.idempotency_key` (keyed off the settlement transaction
hash) should be the enforced idempotency boundary, with Pretium's response
treated as authoritative for status but not assumed to be duplicate-safe on
their end. **Still open:** whether calling `/pay` twice with the same hash
returns the original response or an error — worth a sandbox test before
launch rather than assuming either behavior.

## 12. Still Open — Needs Direct Confirmation or Internal Decision

- **Pretium's SLA on `/v1/status` resolution — decision: no default yet,
  confirm with Pretium first.** Not documented publicly. The `/pay` response
  returns an immediate `PENDING` status with a `transaction_code` to poll
  against, but no published time bound on when `PENDING` resolves to a final
  state. Rather than guessing at a poll timeout, this must be confirmed
  directly with Pretium's account/support team before the escalation
  threshold in requirement 7.4 is finalized. **Action item:** reach out to
  Pretium to get their actual settlement-time SLA (and whether it varies by
  network, e.g. Safaricom vs. other mobile money operators) before writing
  the `PRETIUM_UNKNOWN` → `MANUAL_REVIEW` timeout into the reconciliation
  worker. Until that answer is in hand, the reconciliation worker should be
  built with the timeout as an explicit, easily-changed config value rather
  than a hardcoded constant, so the real number can be dropped in without a
  code change.

See §6.5 for the resolved spend-limit approach (tiered by KYC/verification
level).
