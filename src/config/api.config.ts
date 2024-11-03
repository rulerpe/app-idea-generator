// src/config/api.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('api', () => ({
  anthropic: {
    key: process.env.ANTHROPIC_API_KEY,
  },
}));
