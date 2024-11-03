// src/config/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  // Make password required only in production
  DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  CLOUD_SQL_CONNECTION_NAME: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
  }),
  ANTHROPIC_API_KEY: Joi.string().required(),
});
