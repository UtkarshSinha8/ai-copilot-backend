import { registerAs } from '@nestjs/config';

const openrouterConfig = registerAs('openrouter', () => ({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
}));
export default openrouterConfig;
