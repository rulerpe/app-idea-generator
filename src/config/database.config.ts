// src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: false,
          }
        : false,
  };

  // Add password and extra configs
  const config = {
    ...baseConfig,
    ...(process.env.DB_PASSWORD && { password: process.env.DB_PASSWORD }),
  };

  // Add Cloud SQL configuration for production
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.CLOUD_SQL_CONNECTION_NAME
  ) {
    return {
      ...config,
      extra: {
        socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      },
    };
  }

  return config;
});
