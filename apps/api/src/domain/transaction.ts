import type { Transaction, TransactionEvent, TransactionId, TransactionStatus } from '@seti/shared';
import { TransactionId as TransactionIdSchema, TransactionStatus as TransactionStatusSchema } from '@seti/shared';

const transitions: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: ['QUOTED'],
  QUOTED: ['POLICY_RESERVED'],
  POLICY_RESERVED: ['SWAPPING', 'SAGA_COMPENSATING', 'PERMANENTLY_FAILED'],
  SWAPPING: ['SWAPPED', 'SETTLEMENT_UNKNOWN', 'SAGA_COMPENSATING', 'PERMANENTLY_FAILED'],
  SWAPPED: ['SETTLEMENT_TRANSFERRING', 'SAGA_COMPENSATING', 'PERMANENTLY_FAILED'],
  SETTLEMENT_TRANSFERRING: ['SETTLEMENT_CONFIRMED', 'SETTLEMENT_UNKNOWN', 'SAGA_COMPENSATING', 'PERMANENTLY_FAILED'],
  SETTLEMENT_UNKNOWN: ['SETTLEMENT_CONFIRMED', 'SAGA_COMPENSATING', 'MANUAL_REVIEW', 'PERMANENTLY_FAILED'],
  SETTLEMENT_CONFIRMED: ['PRETIUM_SUBMITTING', 'SAGA_COMPENSATING', 'PERMANENTLY_FAILED'],
  PRETIUM_SUBMITTING: ['PRETIUM_VERIFYING', 'PRETIUM_UNKNOWN', 'SAGA_COMPENSATING', 'PERMANENTLY_FAILED'],
  PRETIUM_VERIFYING: ['PRETIUM_CONFIRMED', 'PRETIUM_UNKNOWN', 'MANUAL_REVIEW', 'PERMANENTLY_FAILED'],
  PRETIUM_UNKNOWN: ['PRETIUM_CONFIRMED', 'SAGA_COMPENSATING', 'MANUAL_REVIEW', 'PERMANENTLY_FAILED'],
  PRETIUM_CONFIRMED: ['COMPLETED'],
  COMPLETED: [],
  SAGA_COMPENSATING: ['SAGA_COMPENSATED', 'MANUAL_REVIEW', 'PERMANENTLY_FAILED'],
  SAGA_COMPENSATED: [],
  MANUAL_REVIEW: ['COMPLETED', 'SAGA_COMPENSATED', 'PERMANENTLY_FAILED'],
  PERMANENTLY_FAILED: [],
};

export function generateTransactionId(): TransactionId {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return TransactionIdSchema.parse(`JOB-${suffix}`);
}

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return transitions[from].includes(to);
}

export function applyEvent(tx: Transaction, event: TransactionEvent): Transaction {
  const nextStatus = resolveNextStatus(event.type);
  if (!canTransition(tx.status, nextStatus)) {
    throw new Error(`Invalid transition from ${tx.status} to ${nextStatus}`);
  }

  const updated: Transaction = {
    ...tx,
    status: nextStatus,
    updatedAt: new Date(),
  };

  if (event.type === 'SETTLEMENT_CONFIRMED' && 'transactionHash' in event) {
    updated.settlement.transactionHash = event.transactionHash;
  }

  if (event.type === 'PRETIUM_CONFIRMED' && 'reference' in event) {
    updated.payout = { ...updated.payout, reference: event.reference };
  }

  if (event.type === 'COMPENSATION_COMPLETED' && 'refundTransactionHash' in event) {
    updated.failureReason = event.refundTransactionHash;
  }

  return updated;
}

function resolveNextStatus(eventType: TransactionEvent['type']): TransactionStatus {
  const map: Record<TransactionEvent['type'], TransactionStatus> = {
    QUOTE_CREATED: 'QUOTED',
    POLICY_RESERVED: 'POLICY_RESERVED',
    SWAP_INITIATED: 'SWAPPING',
    SWAP_CONFIRMED: 'SWAPPED',
    SETTLEMENT_INITIATED: 'SETTLEMENT_TRANSFERRING',
    SETTLEMENT_CONFIRMED: 'SETTLEMENT_CONFIRMED',
    PRETIUM_SUBMITTED: 'PRETIUM_SUBMITTING',
    PRETIUM_CONFIRMED: 'PRETIUM_CONFIRMED',
    COMPLETED: 'COMPLETED',
    COMPENSATION_INITIATED: 'SAGA_COMPENSATING',
    COMPENSATION_COMPLETED: 'SAGA_COMPENSATED',
    MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW',
    PERMANENTLY_FAILED: 'PERMANENTLY_FAILED',
  };
  return TransactionStatusSchema.parse(map[eventType]);
}
