import { CurrencyCode, PayoutRail, TransferIntent } from '@seti/shared';
import { ValidationError } from '../domain/errors.js';

export function parseTransferIntent(rawMessage: string): TransferIntent {
  const text = rawMessage.trim();

  // Very simple regex parser for prototype: "Send KES 500 to 0722111222 for rent"
  const match = text.match(/send\s+(?:(KES|USD|EUR)\s+)?(\d+(?:\.\d+)?)\s+to\s+(\S+)(?:\s+for\s+(.+))?/i);
  if (!match) {
    throw new ValidationError('Could not parse your request. Try: "Send KES 500 to 0722111222"');
  }

  const [, currencyRaw, amount, recipient, memo] = match;
  const currency = (currencyRaw ?? 'KES').toUpperCase() as CurrencyCode;
  const payoutRail = recipient.match(/^\d+$/) ? PayoutRail.enum.mobile_money : PayoutRail.enum.mobile_money;

  return TransferIntent.parse({
    recipientIdentifier: recipient,
    amount,
    currency,
    payoutRail,
    memo,
  });
}
