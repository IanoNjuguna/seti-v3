import { config } from '../config/index.js';
import { prisma } from '../adapters/prisma.js';
import { PretiumAdapter } from '../adapters/pretium.js';
import { generateNonce, generateQuoteId } from '../domain/quote.js';
import { ValidationError } from '../domain/errors.js';
import type { Quote } from '@seti/shared';

const pretium = new PretiumAdapter();

export async function createQuote(
  userId: string,
  recipientIdentifier: string,
  amount: string,
  currency: 'KES' | 'USD' | 'EUR',
): Promise<Quote> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ValidationError('User not found');

  const validation = await pretium.validateRecipient(recipientIdentifier, currency, 'mobile_money');
  if (!validation.valid) {
    throw new ValidationError('Recipient could not be validated. Please double-check the number.');
  }

  const amountValue = Number(amount);
  const minorUnits = Math.round(amountValue * 100);

  const fx = await pretium.getExchangeRate(config.SETTLEMENT_ASSET, currency);
  const rate = Number(fx.rate);
  const netOutput = (amountValue / rate).toFixed(6);
  const totalDebit = (Number(netOutput) * 1.02).toFixed(6); // 2% fee stub

  const quote: Quote = {
    id: generateQuoteId(),
    userId,
    recipientIdentifier: validation.normalizedIdentifier!,
    recipientHash: `hmac_sha256_${validation.normalizedIdentifier}`,
    payoutRail: 'mobile_money',
    transferAmount: {
      value: amountValue.toFixed(2),
      currency,
      minorUnits,
      decimals: 2,
    },
    fxRate: {
      base: 'USD',
      quote: currency,
      rate: fx.rate,
      source: 'Pretium rate lock',
    },
    netOutput: {
      value: netOutput,
      asset: 'USDC',
      minorUnits: Math.round(Number(netOutput) * 1_000_000),
      decimals: 6,
    },
    totalDebit: {
      value: totalDebit,
      asset: 'USDC',
      minorUnits: Math.round(Number(totalDebit) * 1_000_000),
      decimals: 6,
    },
    route: 'Uniswap V3 (EURC → WETH → USDC)',
    settlementChain: config.SETTLEMENT_CHAIN,
    maxSlippageInput: {
      value: (Number(totalDebit) - Number(netOutput)).toFixed(6),
      asset: 'USDC',
      capPercent: 0.5,
    },
    expiresAt: fx.expiresAt,
    nonce: generateNonce(),
  };

  await prisma.quote.create({
    data: {
      id: quote.id,
      userId: quote.userId,
      recipientIdentifier: quote.recipientIdentifier,
      recipientHash: quote.recipientHash,
      payoutRail: quote.payoutRail,
      transferCurrency: quote.transferAmount.currency,
      transferMinorUnits: quote.transferAmount.minorUnits,
      transferDecimals: quote.transferAmount.decimals,
      fxRate: quote.fxRate.rate,
      netOutputAsset: quote.netOutput.asset,
      netOutputMinorUnits: quote.netOutput.minorUnits,
      totalDebitAsset: quote.totalDebit.asset,
      totalDebitMinorUnits: quote.totalDebit.minorUnits,
      route: quote.route,
      settlementChain: quote.settlementChain,
      maxSlippageAsset: quote.maxSlippageInput.asset,
      maxSlippageMinorUnits: Math.round(Number(quote.maxSlippageInput.value) * 1_000_000),
      maxSlippageCapPercent: quote.maxSlippageInput.capPercent,
      expiresAt: quote.expiresAt,
      nonce: quote.nonce,
    },
  });

  return quote;
}
