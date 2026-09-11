import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PRETIUM_API_URL: z.string().default('https://api.pretium.io'),
  PRETIUM_API_KEY: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().default('seti-dev-token'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  SETTLEMENT_CHAIN: z.string().default('celo'),
  SETTLEMENT_ASSET: z.string().default('USDC'),
});

export const config = envSchema.parse(process.env);
