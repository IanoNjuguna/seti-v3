export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable = false,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class QuoteExpiredError extends DomainError {
  constructor(quoteId: string) {
    super(`Quote ${quoteId} has expired`, 'QUOTE_EXPIRED');
  }
}

export class PolicyLimitError extends DomainError {
  constructor(message: string) {
    super(message, 'POLICY_LIMIT_EXCEEDED');
  }
}

export class IdempotencyError extends DomainError {
  constructor(message: string) {
    super(message, 'IDEMPOTENCY_ERROR');
  }
}

export class SettlementError extends DomainError {
  constructor(message: string, isRetryable = false) {
    super(message, 'SETTLEMENT_ERROR', isRetryable);
  }
}
