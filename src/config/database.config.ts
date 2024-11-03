// src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppIdea } from '../entities/app-idea.entity';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production configuration using Cloud SQL socket
    return {
      type: 'postgres',
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [AppIdea],
      migrations: ['dist/migrations/*{.ts,.js}'],
      migrationsRun: true,
      synchronize: false,
      ssl: false,
      extra: {
        socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      },
    };
  }

  // Development/Test configuration
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    entities: [AppIdea],
    migrations: ['dist/migrations/*{.ts,.js}'],
    migrationsRun: true,
    synchronize: process.env.NODE_ENV === 'development',
    ssl: false,
  };
});
