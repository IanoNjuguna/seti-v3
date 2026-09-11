import { z } from 'zod';

export const PayoutRail = z.enum(['mobile_money', 'paybill', 'till', 'bank']);
export type PayoutRail = z.infer<typeof PayoutRail>;

export const CurrencyCode = z.enum(['KES', 'USD', 'EUR']);
export type CurrencyCode = z.infer<typeof CurrencyCode>;

export const AssetCode = z.enum(['USDC', 'EURC']);
export type AssetCode = z.infer<typeof AssetCode>;

export const TransferIntent = z.object({
  recipientIdentifier: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a positive number'),
  currency: CurrencyCode.default('KES'),
  payoutRail: PayoutRail.default('mobile_money'),
  memo: z.string().optional(),
});
export type TransferIntent = z.infer<typeof TransferIntent>;

export const ParseIntentRequest = z.object({
  rawMessage: z.string().min(1),
  userId: z.string().uuid(),
});
export type ParseIntentRequest = z.infer<typeof ParseIntentRequest>;

export const ParseIntentResponse = z.object({
  intent: TransferIntent,
  rawMessage: z.string(),
});
export type ParseIntentResponse = z.infer<typeof ParseIntentResponse>;
