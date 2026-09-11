export interface WhatsAppMessage {
  from: string;
  body: string;
  messageId: string;
  timestamp: number;
}

export class WhatsAppAdapter {
  async sendMessage(_to: string, body: string): Promise<void> {
    // Stub: log to console for prototype
    console.log(`[WhatsApp] >> ${_to}:\n${body}\n`);
  }

  parseWebhookPayload(payload: unknown): WhatsAppMessage | null {
    // Minimal stub parser for Meta WhatsApp webhook structure
    const p = payload as any;
    const message = p?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || message.type !== 'text') return null;

    return {
      from: message.from,
      body: message.text?.body ?? '',
      messageId: message.id,
      timestamp: Number(message.timestamp),
    };
  }
}
