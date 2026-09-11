import type { Quote, QuoteId } from '@seti/shared';
import { QuoteId as QuoteIdSchema } from '@seti/shared';

export function generateQuoteId(): QuoteId {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return QuoteIdSchema.parse(`QT-${suffix}`);
}

export function generateNonce(): string {
  return `nonce_${Math.random().toString(36).slice(2, 11)}`;
}

export function isQuoteExpired(quote: Quote): boolean {
  return new Date() > quote.expiresAt;
}
