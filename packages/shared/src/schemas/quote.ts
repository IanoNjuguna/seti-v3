import { z } from 'zod';
import { AssetCode, CurrencyCode, PayoutRail } from './intent.js';

export const QuoteId = z.string().regex(/^QT-[A-Z0-9]+$/);
export type QuoteId = z.infer<typeof QuoteId>;

export const Quote = z.object({
  id: QuoteId,
  userId: z.string().uuid(),
  recipientIdentifier: z.string(),
  recipientHash: z.string(),
  payoutRail: PayoutRail,
  transferAmount: z.object({
    value: z.string(),
    currency: CurrencyCode,
    minorUnits: z.number().int(),
    decimals: z.number().int(),
  }),
  fxRate: z.object({
    base: CurrencyCode,
    quote: CurrencyCode,
    rate: z.string(),
    source: z.string(),
  }),
  netOutput: z.object({
    value: z.string(),
    asset: AssetCode,
    minorUnits: z.number().int(),
    decimals: z.number().int(),
  }),
  totalDebit: z.object({
    value: z.string(),
    asset: AssetCode,
    minorUnits: z.number().int(),
    decimals: z.number().int(),
  }),
  route: z.string(),
  settlementChain: z.string(),
  maxSlippageInput: z.object({
    value: z.string(),
    asset: AssetCode,
    capPercent: z.number(),
  }),
  expiresAt: z.coerce.date(),
  nonce: z.string(),
});
export type Quote = z.infer<typeof Quote>;

export const CreateQuoteRequest = z.object({
  userId: z.string().uuid(),
  intent: z.object({
    recipientIdentifier: z.string(),
    amount: z.string(),
    currency: CurrencyCode,
    payoutRail: PayoutRail,
    memo: z.string().optional(),
  }),
});
export type CreateQuoteRequest = z.infer<typeof CreateQuoteRequest>;

export const ConfirmQuoteRequest = z.object({
  userId: z.string().uuid(),
  quoteId: QuoteId,
  nonce: z.string(),
});
export type ConfirmQuoteRequest = z.infer<typeof ConfirmQuoteRequest>;
