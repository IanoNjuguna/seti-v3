# SETI — Onboarding Flow

Draws on the identity model, KYC-tiered policy limits, and non-goals defined
in the PRD (§5 Users, §6.5 Policy/spend limits, §4 Non-Goals), and follows
the same conversational conventions as the main wireframe. Onboarding must
complete — or explicitly stop at a known, resumable point — before a user's
first `createQuote()` call; it is not a separate product surface, it's the
same WhatsApp thread, gated in front of Flow 1 of the main wireframe.

## Design principles carried over from the PRD/system prompt

- The agent still never computes balances, limits, or identity state itself
  — every claim in these flows (tier, limit, wallet address) is relayed from
  a backend call, per the system prompt's scope-of-authority rules.
- No in-chat wallet funding UI (PRD §4 Non-Goals) — onboarding gives the user
  a deposit address and instructions, it does not process a funding
  transaction itself.
- Tier 1 (basic) should require minimal friction — phone number + terms is
  enough to get a working, if limited, account. Higher tiers are optional
  upgrades a user can defer indefinitely, not a gate in front of first use.

---

## Flow O1 — First Contact & Terms

Triggered on a user's first message ever to the SETI number.

``` text
[ User ]
Hi

[ SETI Bot ]
👋 *Welcome to SETI*
──────────────────────────────────
SETI lets you send money straight to M-Pesa from your stablecoin balance —
right here in WhatsApp. No app, no separate wallet screen.

Before we set up your account, please confirm you've read our Terms of
Service and Privacy Policy:
🔗 seti.network/terms · seti.network/privacy

Reply *AGREE* to continue.

[ User ]
AGREE

[ SETI Bot ]
Thanks — setting up your account now. This takes a few seconds. ⏳
```

If the user replies with anything other than `AGREE`:

``` text
[ SETI Bot ]
No problem — whenever you're ready, reply *AGREE* to set up your account
and start sending money. If you have questions about the terms first, just
ask.
```

---

## Flow O2 — Identity & Wallet Provisioning

Runs automatically after `AGREE`. This is where `users.user_id`,
`phone_lookup_token`, `smart_account_address`, and `session_key_address`
get created — the user never sees the raw phone-hash mechanics, only the
result.

``` text
[ SETI Bot ]
✅ *Account Created*
──────────────────────────────────
• Account ID: `USR-4471`
• Your SETI Wallet Address: `0x7c3a...9e21`
• Network: Celo
• Verification Tier: *Tier 1 (Basic)*
• Daily Sending Limit: *$10.00 USDC*
──────────────────────────────────
Your wallet is ready. To send money, it needs a balance — see the next
message for how to fund it.
```

---

## Flow O3 — Funding Instructions

``` text
[ SETI Bot ]
💰 *Fund Your SETI Wallet*
──────────────────────────────────
Send USDC or EURC to your wallet address on a supported network:

📍 Address: `0x7c3a...9e21`
🔗 Supported networks: Celo, Base, Ethereum, Polygon, Arbitrum

⚠️ Only send USDC or EURC on one of these networks. Funds sent on an
unsupported network or in a different asset cannot be recovered
automatically.

Once your deposit confirms, just message me with a transfer request —
for example: *"Send KES 500 to 0722111222"*
```

### Edge case — user attempts a transfer before funding / with insufficient balance

``` text
[ User ]
Send KES 500 to 0722111222

[ SETI Bot ]
⚠️ *Insufficient Balance*
──────────────────────────────────
Your wallet doesn't have enough funds for this transfer yet.

• Current Balance: *$0.00 USDC*
• Your Deposit Address: `0x7c3a...9e21` (Celo, Base, Ethereum, Polygon, or
  Arbitrum — USDC or EURC only)

Send funds to that address, then try your transfer again.
```

---

## Flow O4 — Tier Upgrade (Optional, KYC-Gated Higher Limits)

Offered contextually — either proactively after a short delay post-Flow O3,
or reactively when a user hits their Tier 1 limit (see Flow 5 of the main
wireframe, "Daily Sending Limit Reached").

``` text
[ SETI Bot ]
📈 *Want a higher sending limit?*
──────────────────────────────────
You're currently on *Tier 1* ($10.00 USDC/day). Verifying your identity
unlocks higher limits:

• *Tier 2* — Basic ID verification → $50.00 USDC/day
• *Tier 3* — Full verification → $500.00 USDC/day

Reply *VERIFY* to start, or ignore this — Tier 1 works fine for smaller
transfers.

[ User ]
VERIFY

[ SETI Bot ]
You'll be redirected to a secure verification link. This is handled by our
verification partner — SETI never sees or stores your ID documents
directly.

🔗 [verification link]

We'll message you here as soon as it's done — usually within a few
minutes.

  ... (verification completes) ...

[ SETI Bot ]
✅ *Verification Complete — You're now Tier 2*
──────────────────────────────────
Your daily sending limit is now *$50.00 USDC*.
```

### Edge case — verification fails or is inconclusive

``` text
[ SETI Bot ]
⚠️ *We Couldn't Verify Your Identity*
──────────────────────────────────
Your Tier 1 limit is unaffected — you can keep sending up to $10.00 USDC/day
as normal.

If you'd like to try verification again, reply *VERIFY*, or contact support
if you think this is a mistake.
```

---

## Flow O5 — Ready State / First-Transfer Nudge

If a user has funded their wallet but hasn't yet sent a transfer within a
reasonable window, a single nudge (respecting WhatsApp session/template
constraints — see PRD §10 Risks) is acceptable:

``` text
[ SETI Bot ]
👋 Your wallet is funded and ready to go. Whenever you'd like to send
money, just tell me the amount and the recipient's number — for example:

*"Send KES 1000 to 0722111222"*
```

---

## Flow O6 — Returning User (Already Onboarded)

A user who has already completed Flow O1–O2 skips onboarding entirely on
any subsequent message — onboarding state is a one-time gate, not a
recurring check.

``` text
[ User ]
Send KES 200 to 0733222111

[ SETI Bot ]
📋 *Payment Quote Generated* [ID: QT-9014]
──────────────────────────────────
...
``` markdown

> (proceeds directly into Flow 1 of the main wireframe — no re-onboarding)

---

## Appendix: Backend Requirements Introduced by Onboarding

These extend the PRD's functional/non-functional requirements and should be
folded into §6/§7 on the next PRD revision:

- **New functional requirement:** the system must gate `createQuote()`
  behind a completed onboarding state (terms accepted + account
  provisioned) — a user who hasn't completed Flow O1–O2 should never reach
  a quote, regardless of what they type.
- **New functional requirement:** the policy engine's tier lookup (already
  scoped in PRD §6.5) needs a concrete tier→limit table and a documented
  upgrade path — this flow assumes three tiers ($10/$50/$500) as an
  illustrative default, not a finalized number; needs product sign-off.
- **New dependency:** a third-party identity verification provider for
  Tier 2/3 upgrades. Not previously listed in PRD §8 Dependencies — needs
  to be selected and added. `users.nullifier_hash` and
  `is_personhood_verified` already anticipate this in the schema but no
  provider is currently wired up.
- **New non-functional requirement:** verification failures must never
  silently reduce a user below their current tier — Tier 1 access must
  remain available regardless of a failed upgrade attempt (see Flow O4 edge
  case).
- **Open question, same category as the Pretium SLA item:** what's the
  expected turnaround time for the identity verification provider, and
  should SETI poll or rely on their webhook for the "verification complete"
  message — mirrors the polling-vs-webhook design already established for
  Pretium (PRD §7.4) and should probably follow the same pattern once a
  provider is chosen.
