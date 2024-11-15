// src/config/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  ANTHROPIC_API_KEY: Joi.string().required(),
  GCP_PROJECT_ID: Joi.string().required(),
  MONITORING_ENABLED: Joi.boolean().default(true),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
});
