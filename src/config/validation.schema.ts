// src/config/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  // DB_HOST and DB_PORT only required in non-production
  DB_HOST: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PORT: Joi.number().when('NODE_ENV', {
    is: 'production',
    then: Joi.optional(),
    otherwise: Joi.number().default(5432),
  }),
  DB_USERNAME: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  CLOUD_SQL_CONNECTION_NAME: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  ANTHROPIC_API_KEY: Joi.string().required(),
  // Monitoring configuration
  GCP_PROJECT_ID: Joi.string().required(),
  MONITORING_ENABLED: Joi.boolean().default(true),
});
