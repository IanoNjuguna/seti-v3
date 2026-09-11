import { prisma } from '../adapters/prisma.js';
import { PretiumAdapter } from '../adapters/pretium.js';
import { OnChainAdapter } from '../adapters/onchain.js';
import { WhatsAppAdapter } from '../adapters/whatsapp.js';
import { generateTransactionId } from '../domain/transaction.js';
import { isQuoteExpired } from '../domain/quote.js';
import {
  IdempotencyError,
  PolicyLimitError,
  QuoteExpiredError,
  ValidationError,
} from '../domain/errors.js';
import type { Transaction } from '@seti/shared';

const pretium = new PretiumAdapter();
const onchain = new OnChainAdapter();
const whatsapp = new WhatsAppAdapter();

export async function confirmTransaction(
  userId: string,
  quoteId: string,
  nonce: string,
): Promise<Transaction> {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, userId },
  });
  if (!quote) throw new ValidationError('Quote not found');
  if (quote.nonce !== nonce) throw new ValidationError('Invalid confirmation nonce');

  const cached = await prisma.transaction.findFirst({ where: { quoteId: quote.id } });
  if (cached) {
    throw new IdempotencyError(
      `This confirmation was already processed as ${cached.id}. No secondary charge was made.`,
    );
  }

  const quoteObject = {
    ...quote,
    transferAmount: {
      value: (quote.transferMinorUnits / 100).toFixed(2),
      currency: quote.transferCurrency,
      minorUnits: quote.transferMinorUnits,
      decimals: quote.transferDecimals,
    },
    expiresAt: quote.expiresAt,
  } as any;

  if (isQuoteExpired(quoteObject)) {
    throw new QuoteExpiredError(quoteId);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ValidationError('User not found');

  const projectedDaily = user.dailySentMinorUnits + quote.totalDebitMinorUnits;
  if (projectedDaily > user.dailyLimitMinorUnits) {
    throw new PolicyLimitError(
      `This transfer would put you over your daily limit. You can send up to ${(
        (user.dailyLimitMinorUnits - user.dailySentMinorUnits) /
        1_000_000
      ).toFixed(2)} USDC more today.`,
    );
  }

  const txId = generateTransactionId();
  const transaction: Transaction = {
    id: txId,
    userId,
    quoteId: quote.id,
    status: 'POLICY_RESERVED',
    recipientIdentifier: quote.recipientIdentifier,
    recipientHash: quote.recipientHash,
    payoutRail: quote.payoutRail as any,
    transferAmount: {
      value: (quote.transferMinorUnits / 100).toFixed(2),
      currency: quote.transferCurrency as any,
      minorUnits: quote.transferMinorUnits,
      decimals: quote.transferDecimals,
    },
    settlement: {
      asset: quote.totalDebitAsset as any,
      chain: quote.settlementChain,
      amount: (quote.totalDebitMinorUnits / 1_000_000).toFixed(6),
    },
    payout: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { dailySentMinorUnits: projectedDaily },
    }),
    prisma.transaction.create({
      data: {
        id: transaction.id,
        userId: transaction.userId,
        quoteId: transaction.quoteId,
        status: transaction.status,
        recipientIdentifier: transaction.recipientIdentifier,
        recipientHash: transaction.recipientHash,
        payoutRail: transaction.payoutRail,
        transferCurrency: transaction.transferAmount.currency,
        transferMinorUnits: transaction.transferAmount.minorUnits,
        totalDebitAsset: quote.totalDebitAsset,
        totalDebitMinorUnits: quote.totalDebitMinorUnits,
        settlementAsset: transaction.settlement.asset,
        settlementChain: transaction.settlement.chain,
        settlementAmount: transaction.settlement.amount,
      },
    }),
    prisma.transactionEvent.create({
      data: {
        transactionId: transaction.id,
        type: 'POLICY_RESERVED',
        payload: { reservationId: `RES-${Math.random().toString(36).slice(2, 8).toUpperCase()}` },
      },
    }),
  ]);

  // Fire-and-forget settlement simulation for prototype
  settleTransaction(txId).catch(console.error);

  return transaction;
}

async function settleTransaction(transactionId: string): Promise<void> {
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) return;

  const updateStatus = async (status: string, eventType: string, payload: Record<string, unknown>) => {
    await prisma.transaction.update({ where: { id: transactionId }, data: { status } });
    await prisma.transactionEvent.create({
      data: { transactionId, type: eventType, payload: payload as any },
    });
  };

  await updateStatus('SWAPPING', 'SWAP_INITIATED', {});
  const swap = await onchain.swap('EURC', 'USDC', tx.settlementAmount, tx.settlementChain);
  await updateStatus('SWAPPED', 'SWAP_CONFIRMED', { transactionHash: swap.transactionHash });

  await updateStatus('SETTLEMENT_TRANSFERRING', 'SETTLEMENT_INITIATED', {});
  const settlement = await onchain.sendSettlement(
    tx.settlementAsset as any,
    tx.settlementAmount,
    tx.settlementChain,
  );
  await updateStatus('SETTLEMENT_CONFIRMED', 'SETTLEMENT_CONFIRMED', {
    transactionHash: settlement.transactionHash,
  });

  await updateStatus('PRETIUM_SUBMITTING', 'PRETIUM_SUBMITTED', {});
  const payout = await pretium.submitPayout(
    tx.recipientIdentifier,
    tx.transferCurrency as any,
    tx.transferMinorUnits,
    settlement.transactionHash,
  );

  if (payout.status === 'FAILED') {
    await updateStatus('SAGA_COMPENSATING', 'COMPENSATION_INITIATED', { reason: 'Pretium payout failed' });
    await prisma.user.update({
      where: { id: tx.userId },
      data: { dailySentMinorUnits: { decrement: tx.totalDebitMinorUnits } },
    });
    await updateStatus('SAGA_COMPENSATED', 'COMPENSATION_COMPLETED', {});
    return;
  }

  await updateStatus('PRETIUM_VERIFYING', 'PRETIUM_CONFIRMED', { reference: payout.reference });

  // Poll once for prototype
  await new Promise((r) => setTimeout(r, 2000));
  const finalStatus = await pretium.checkPayoutStatus(payout.reference);

  if (finalStatus.status === 'CONFIRMED') {
    await updateStatus('COMPLETED', 'COMPLETED', {});
    await whatsapp.sendMessage(
      tx.recipientIdentifier,
      `Seti payment settled and dispatched.\n\nRecipient credited with ${tx.transferCurrency} ${(
        tx.transferMinorUnits / 100
      ).toFixed(2)}.`,
    );
  } else if (finalStatus.status === 'FAILED') {
    await updateStatus('SAGA_COMPENSATING', 'COMPENSATION_INITIATED', { reason: 'Payout verification failed' });
    await prisma.user.update({
      where: { id: tx.userId },
      data: { dailySentMinorUnits: { decrement: tx.totalDebitMinorUnits } },
    });
    await updateStatus('SAGA_COMPENSATED', 'COMPENSATION_COMPLETED', {});
  } else {
    await updateStatus('PRETIUM_UNKNOWN', 'PRETIUM_CONFIRMED', { reference: payout.reference });
  }
}
