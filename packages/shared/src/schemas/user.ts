import { z } from 'zod';

export const VerificationTier = z.enum(['TIER_1', 'TIER_2', 'TIER_3']);
export type VerificationTier = z.infer<typeof VerificationTier>;

export const User = z.object({
  id: z.string().uuid(),
  phoneNumber: z.string(),
  phoneLookupToken: z.string(),
  smartAccountAddress: z.string(),
  sessionKeyAddress: z.string(),
  verificationTier: VerificationTier,
  dailyLimitMinorUnits: z.number().int(),
  dailySentMinorUnits: z.number().int().default(0),
  limitResetsAt: z.coerce.date(),
  agreedToTermsAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof User>;

export const DailyLimitTier = z.record(VerificationTier, z.number().int());
export type DailyLimitTier = z.infer<typeof DailyLimitTier>;
