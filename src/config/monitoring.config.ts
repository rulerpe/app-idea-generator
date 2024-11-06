import { registerAs } from '@nestjs/config';

export default registerAs('monitoring', () => ({
  projectId: process.env.GCP_PROJECT_ID || '',
  enabled: process.env.MONITORING_ENABLED === 'true',
  metricPrefix: 'app_idea_generator',
  customMetrics: {
    apiResponseTime: 'api_response_time',
    apiErrorRate: 'api_error_rate',
    apiRequestCount: 'api_request_count',
    resourceUsageMemory: 'resource_usage_memory',
    resourceUsageCpu: 'resource_usage_cpu',
  },
}));
