import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createQuote } from '../usecases/create-quote.js';
import { confirmTransaction } from '../usecases/confirm-transaction.js';
import { getTransactionStatus } from '../usecases/get-transaction-status.js';
import { prisma } from '../adapters/prisma.js';
import { DomainError } from '../domain/errors.js';

const CreateQuoteBody = z.object({
  userId: z.string().uuid(),
  recipientIdentifier: z.string(),
  amount: z.string(),
  currency: z.enum(['KES', 'USD', 'EUR']),
});

const ConfirmBody = z.object({
  userId: z.string().uuid(),
  quoteId: z.string(),
  nonce: z.string(),
});

export async function quoteRoutes(app: FastifyInstance) {
  app.post('/quotes', async (request, reply) => {
    try {
      const body = CreateQuoteBody.parse(request.body);
      const quote = await createQuote(body.userId, body.recipientIdentifier, body.amount, body.currency);
      return quote;
    } catch (err) {
      if (err instanceof DomainError) return reply.status(400).send({ error: err.message, code: err.code });
      if (err instanceof z.ZodError) return reply.status(400).send({ error: err.format() });
      throw err;
    }
  });

  app.post('/quotes/confirm', async (request, reply) => {
    try {
      const body = ConfirmBody.parse(request.body);
      const tx = await confirmTransaction(body.userId, body.quoteId, body.nonce);
      return tx;
    } catch (err) {
      if (err instanceof DomainError) return reply.status(400).send({ error: err.message, code: err.code });
      if (err instanceof z.ZodError) return reply.status(400).send({ error: err.format() });
      throw err;
    }
  });

  app.get('/transactions', async (request, reply) => {
    const { userId } = request.query as { userId?: string };
    if (!userId) return reply.status(400).send({ error: 'userId query param required' });

    const txs = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return txs.map((tx) => ({
      id: tx.id,
      status: tx.status,
      recipientHash: tx.recipientHash,
      transferAmount: `${tx.transferCurrency} ${(tx.transferMinorUnits / 100).toFixed(2)}`,
      settlementTxHash: tx.settlementTxHash,
      payoutReference: tx.payoutReference,
      createdAt: tx.createdAt,
    }));
  });

  app.get('/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId?: string };
    if (!userId) return reply.status(400).send({ error: 'userId query param required' });

    const tx = await getTransactionStatus(userId, id);
    if (!tx) return reply.status(404).send({ error: 'Transaction not found' });
    return tx;
  });
}
