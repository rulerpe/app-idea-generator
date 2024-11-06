import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(private readonly monitoringService: MonitoringService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime();
    const monitoringService = this.monitoringService;

    // Track request count
    monitoringService.recordMetric('api_request_count', 1, {
      method: req.method,
      path: req.path,
    });

    // Track memory usage
    const memoryUsage = process.memoryUsage();
    monitoringService.recordMetric(
      'resource_usage_memory',
      memoryUsage.heapUsed / 1024 / 1024,
      {
        type: 'heap',
      },
    );

    // Intercept the response to measure timing and errors
    const originalEnd = res.end;
    res.end = function (
      this: Response,
      ...args: Parameters<typeof originalEnd>
    ): ReturnType<typeof originalEnd> {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds + nanoseconds / 1e9;

      // Record response time
      monitoringService.recordMetric('api_response_time', responseTime, {
        method: req.method,
        path: req.path,
        status: res.statusCode.toString(),
      });

      // Record error rate
      if (res.statusCode >= 400) {
        monitoringService.recordMetric('api_error_rate', 1, {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString(),
        });
      }

      // Track CPU usage
      const cpuUsage = process.cpuUsage();
      monitoringService.recordMetric(
        'resource_usage_cpu',
        (cpuUsage.user + cpuUsage.system) / 1e6, // Convert to seconds
        { type: 'total' },
      );

      return originalEnd.apply(this, args);
    }.bind(res);

    next();
  }
}
