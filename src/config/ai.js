import OpenAI from 'openai';

export const aiClient = new OpenAI({
  baseURL: process.env.AI_BASE_URL,
  apiKey: process.env.AI_API_KEY,
  timeout: 30_000,
  maxRetries: 0, // BullMQ owns retries
});


// Falls back to the chat provider if EMBED_* is not set
export const embedClient = new OpenAI({
  baseURL: process.env.EMBED_BASE_URL ?? process.env.AI_BASE_URL,
  apiKey: process.env.EMBED_API_KEY ?? process.env.AI_API_KEY,
  timeout: 30_000,
  maxRetries: 0,
});