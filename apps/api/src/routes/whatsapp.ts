import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';
import { WhatsAppAdapter } from '../adapters/whatsapp.js';
import { parseTransferIntent } from '../usecases/parse-intent.js';
import { createQuote } from '../usecases/create-quote.js';
import { confirmTransaction } from '../usecases/confirm-transaction.js';
import { DomainError } from '../domain/errors.js';

const whatsapp = new WhatsAppAdapter();

export async function whatsappRoutes(app: FastifyInstance) {
  app.get('/webhooks/whatsapp', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
      return reply.status(200).send(challenge);
    }
    return reply.status(403).send({ error: 'Verification failed' });
  });

  app.post('/webhooks/whatsapp', async (request, reply) => {
    const message = whatsapp.parseWebhookPayload(request.body);
    if (!message) return reply.status(200).send({ received: true });

    // Hardcoded prototype user for simplicity
    const userId = '00000000-0000-0000-0000-000000000001';

    try {
      const text = message.body.trim();

      if (text.toUpperCase() === 'AGREE') {
        await whatsapp.sendMessage(
          message.from,
          'Welcome to Seti.\n\nAccount created. Your wallet address is 0x7c3a...9e21 on Celo.',
        );
        return reply.status(200).send({ received: true });
      }

      if (text.toUpperCase().startsWith('CONFIRM')) {
        const parts = text.split(/\s+/);
        const quoteId = parts[1];
        const nonce = parts[2];
        if (!quoteId || !nonce) {
          await whatsapp.sendMessage(message.from, 'Please send the full confirmation: CONFIRM QT-XXXX nonce_YYYY');
          return reply.status(200).send({ received: true });
        }
        await confirmTransaction(userId, quoteId, nonce);
        await whatsapp.sendMessage(message.from, 'Payment confirmed. Processing...');
        return reply.status(200).send({ received: true });
      }

      const intent = parseTransferIntent(text);
      const quote = await createQuote(userId, intent.recipientIdentifier, intent.amount, intent.currency);

      await whatsapp.sendMessage(
        message.from,
        `Payment Quote Generated [ID: ${quote.id}]\n` +
          `Recipient: ${quote.recipientIdentifier}\n` +
          `Amount: ${quote.transferAmount.currency} ${quote.transferAmount.value}\n` +
          `Total debit: ${quote.totalDebit.asset} ${quote.totalDebit.value}\n` +
          `Expires: 45 seconds\n\n` +
          `Reply CONFIRM ${quote.id} ${quote.nonce} to execute.`,
      );
    } catch (err) {
      const messageText = err instanceof DomainError ? err.message : 'Sorry, I could not process that request.';
      await whatsapp.sendMessage(message.from, messageText);
    }

    return reply.status(200).send({ received: true });
  });
}
