import { Controller, Get } from '@nestjs/common';
import { WhatsAppMetricsService } from 'nest-whatsapp/metrics';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: WhatsAppMetricsService) {}

  @Get()
  metricsEndpoint() {
    return this.metrics.getMetrics();
  }
}
