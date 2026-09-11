import { prisma } from '../adapters/prisma.js';

export async function getTransactionStatus(userId: string, transactionId: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
  if (!tx) return null;

  return {
    id: tx.id,
    status: tx.status,
    recipientHash: tx.recipientHash,
    transferAmount: `${tx.transferCurrency} ${(tx.transferMinorUnits / 100).toFixed(2)}`,
    settlementTxHash: tx.settlementTxHash,
    payoutReference: tx.payoutReference,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    events: tx.events.map((e) => ({ type: e.type, createdAt: e.createdAt })),
  };
}
