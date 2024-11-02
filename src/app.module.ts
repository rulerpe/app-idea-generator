import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppIdea } from './entities/app-idea.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'cookie',
      database: 'app_idea_generator',
      entities: [AppIdea],
      synchronize: true, // Be careful with this in production
    }),
    TypeOrmModule.forFeature([AppIdea]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
