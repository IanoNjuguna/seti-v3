import type { CurrencyCode, PayoutRail } from '@seti/shared';

export interface PretiumValidationResult {
  valid: boolean;
  normalizedIdentifier?: string;
}

export interface PretiumQuote {
  rate: string;
  expiresAt: Date;
}

export interface PretiumPayoutResult {
  reference: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

export class PretiumAdapter {
  constructor() {}

  async validateRecipient(
    identifier: string,
    _currency: CurrencyCode,
    _rail: PayoutRail,
  ): Promise<PretiumValidationResult> {
    // Stub: accept Kenyan MSISDNs starting with 07 or 254
    const normalized = identifier.replace(/\s/g, '');
    const isValid = /^(0\d{9}|254\d{9})$/.test(normalized);
    return { valid: isValid, normalizedIdentifier: isValid ? normalized : undefined };
  }

  async getExchangeRate(
    _fromAsset: string,
    toCurrency: CurrencyCode,
  ): Promise<PretiumQuote> {
    // Stub: fixed rate for prototype
    const rate = toCurrency === 'KES' ? '130.35' : '1.00';
    return {
      rate,
      expiresAt: new Date(Date.now() + 45_000),
    };
  }

  async submitPayout(
    _identifier: string,
    _currency: CurrencyCode,
    _amountMinorUnits: number,
    _transactionHash: string,
  ): Promise<PretiumPayoutResult> {
    // Stub: pretend payout is pending
    return { reference: `PRT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: 'PENDING' };
  }

  async checkPayoutStatus(_reference: string): Promise<PretiumPayoutResult> {
    // Stub: randomly resolve for prototype
    const roll = Math.random();
    if (roll > 0.7) return { reference: _reference, status: 'CONFIRMED' };
    if (roll < 0.1) return { reference: _reference, status: 'FAILED' };
    return { reference: _reference, status: 'PENDING' };
  }
}
