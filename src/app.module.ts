import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppIdea } from './entities/app-idea.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import databaseConfig from './config/database.config';
import monitoringConfig from './config/monitoring.config';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MonitoringMiddleware } from './monitoring/monitoring.middleware';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig, monitoringConfig],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    HttpModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),
    TypeOrmModule.forFeature([AppIdea]),
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MonitoringMiddleware).forRoutes('*');
  }
}
