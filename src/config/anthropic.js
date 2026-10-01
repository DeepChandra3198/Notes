import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  timeout: 30_000, // never let a job hang forever
  maxRetries: 0,   // BullMQ owns retries; two retry layers multiply attempts
});