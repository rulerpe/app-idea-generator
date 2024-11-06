import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonitoringService } from './monitoring.service';
import monitoringConfig from '../config/monitoring.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(monitoringConfig)],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
