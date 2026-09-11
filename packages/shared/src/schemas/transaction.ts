import { z } from 'zod';
import { AssetCode, CurrencyCode, PayoutRail } from './intent.js';

export const TransactionStatus = z.enum([
  'PENDING',
  'QUOTED',
  'POLICY_RESERVED',
  'SWAPPING',
  'SWAPPED',
  'SETTLEMENT_TRANSFERRING',
  'SETTLEMENT_UNKNOWN',
  'SETTLEMENT_CONFIRMED',
  'PRETIUM_SUBMITTING',
  'PRETIUM_VERIFYING',
  'PRETIUM_UNKNOWN',
  'PRETIUM_CONFIRMED',
  'COMPLETED',
  'SAGA_COMPENSATING',
  'SAGA_COMPENSATED',
  'MANUAL_REVIEW',
  'PERMANENTLY_FAILED',
]);
export type TransactionStatus = z.infer<typeof TransactionStatus>;

export const TransactionId = z.string().regex(/^JOB-[A-Z0-9]+$/);
export type TransactionId = z.infer<typeof TransactionId>;

export const Transaction = z.object({
  id: TransactionId,
  userId: z.string().uuid(),
  quoteId: z.string(),
  status: TransactionStatus,
  recipientIdentifier: z.string(),
  recipientHash: z.string(),
  payoutRail: PayoutRail,
  transferAmount: z.object({
    value: z.string(),
    currency: CurrencyCode,
    minorUnits: z.number().int(),
    decimals: z.number().int(),
  }),
  settlement: z.object({
    asset: AssetCode,
    chain: z.string(),
    amount: z.string(),
    transactionHash: z.string().optional(),
  }),
  payout: z.object({
    reference: z.string().optional(),
    verifiedAt: z.coerce.date().optional(),
  }),
  journalId: z.string().optional(),
  failureReason: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Transaction = z.infer<typeof Transaction>;

export const TransactionEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('QUOTE_CREATED'), quoteId: z.string() }),
  z.object({ type: z.literal('POLICY_RESERVED'), reservationId: z.string() }),
  z.object({ type: z.literal('SWAP_INITIATED'), transactionHash: z.string().optional() }),
  z.object({ type: z.literal('SWAP_CONFIRMED'), transactionHash: z.string() }),
  z.object({ type: z.literal('SETTLEMENT_INITIATED'), transactionHash: z.string() }),
  z.object({ type: z.literal('SETTLEMENT_CONFIRMED'), transactionHash: z.string() }),
  z.object({ type: z.literal('PRETIUM_SUBMITTED'), reference: z.string() }),
  z.object({ type: z.literal('PRETIUM_CONFIRMED'), reference: z.string() }),
  z.object({ type: z.literal('COMPLETED') }),
  z.object({ type: z.literal('COMPENSATION_INITIATED'), reason: z.string() }),
  z.object({ type: z.literal('COMPENSATION_COMPLETED'), refundTransactionHash: z.string().optional() }),
  z.object({ type: z.literal('MANUAL_REVIEW_REQUIRED'), reason: z.string() }),
  z.object({ type: z.literal('PERMANENTLY_FAILED'), reason: z.string() }),
]);
export type TransactionEvent = z.infer<typeof TransactionEvent>;
