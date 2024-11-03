import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { join } from 'path';
import { AppIdea } from '../entities/app-idea.entity';

config();

const configService = new ConfigService();

const isProduction = configService.get('NODE_ENV') === 'production';

export default new DataSource({
  type: 'postgres',
  host: isProduction
    ? `/cloudsql/${configService.get('CLOUD_SQL_CONNECTION_NAME')}`
    : configService.get('DB_HOST'),
  port: isProduction ? undefined : configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),
  entities: [AppIdea],
  migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  extra: isProduction
    ? {
        socketPath: `/cloudsql/${configService.get('CLOUD_SQL_CONNECTION_NAME')}`,
      }
    : undefined,
  ssl: isProduction ? false : undefined,
});
