import { registerAs } from '@nestjs/config';

export default registerAs('firestore', () => ({
  projectId: process.env.GCP_PROJECT_ID,
  credentials:
    process.env.NODE_ENV === 'production'
      ? undefined
      : JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'),
}));
