import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as monitoring from '@google-cloud/monitoring';
import { google } from '@google-cloud/monitoring/build/protos/protos';

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private client: monitoring.v3.MetricServiceClient;
  private projectId: string;
  private metricPrefix: string;
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    this.projectId = this.configService.get<string>('monitoring.projectId');
    this.metricPrefix = this.configService.get<string>(
      'monitoring.metricPrefix',
    );
    this.enabled = this.configService.get<boolean>('monitoring.enabled');

    if (this.enabled) {
      this.client = new monitoring.v3.MetricServiceClient({
        projectId: this.projectId,
      });
    }
  }

  async onModuleInit() {
    if (!this.enabled) return;
    await this.createCustomMetrics();
  }

  async onModuleDestroy() {
    if (this.enabled && this.client) {
      await this.client.close();
    }
  }

  private async createCustomMetrics() {
    const metrics = this.configService.get<Record<string, string>>(
      'monitoring.customMetrics',
    );

    for (const [, value] of Object.entries(metrics)) {
      const metricType = `custom.googleapis.com/${this.metricPrefix}/${value}`;

      try {
        const request = {
          name: `projects/${this.projectId}`,
          metricDescriptor: {
            name: `projects/${this.projectId}/metricDescriptors/${metricType}`,
            description: `Custom metric for ${value}`,
            displayName: value,
            type: metricType,
            metricKind: google.api.MetricDescriptor.MetricKind.GAUGE,
            valueType: google.api.MetricDescriptor.ValueType.DOUBLE,
            unit: value.includes('Time') ? 's' : '1',
            labels: [
              {
                key: 'environment',
                valueType: google.api.LabelDescriptor.ValueType.STRING,
                description: 'Environment (production, staging, etc.)',
              },
            ],
          },
        };

        await this.client.createMetricDescriptor(request);
      } catch (error) {
        // Ignore if metric already exists
        if (!error.message?.includes('ALREADY_EXISTS')) {
          console.error('Error creating metric descriptor:', error);
          throw error;
        }
      }
    }
  }

  async recordMetric(
    metricName: string,
    value: number,
    labels: Record<string, string> = {},
  ) {
    if (!this.enabled) return;

    const metrics = this.configService.get<Record<string, string>>(
      'monitoring.customMetrics',
    );
    const metricKey = Object.entries(metrics).find(
      ([, val]) => val === metricName,
    )?.[0];

    if (!metricKey) {
      throw new Error(`Unknown metric: ${metricName}`);
    }

    const dataPoint = {
      interval: {
        endTime: {
          seconds: Math.floor(Date.now() / 1000),
        },
      },
      value: {
        doubleValue: value,
      },
    };

    const timeSeriesData = {
      metric: {
        type: `custom.googleapis.com/${this.metricPrefix}/${metricName}`,
        labels: {
          environment: process.env.NODE_ENV || 'development',
          ...labels,
        },
      },
      resource: {
        type: 'global',
        labels: {
          project_id: this.projectId,
        },
      },
      points: [dataPoint],
    };

    try {
      const request = {
        name: `projects/${this.projectId}`,
        timeSeries: [timeSeriesData],
      };

      await this.client.createTimeSeries(request);
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }
}
