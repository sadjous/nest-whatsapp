import { Global, Module } from '@nestjs/common';
import { WhatsAppMetricsService } from '../services/whatsapp.metrics';
import { WHATSAPP_METRICS_SERVICE } from '../interfaces/whatsapp-metrics.interface';

@Global()
@Module({
  providers: [
    WhatsAppMetricsService,
    { provide: WHATSAPP_METRICS_SERVICE, useExisting: WhatsAppMetricsService },
  ],
  exports: [WhatsAppMetricsService, WHATSAPP_METRICS_SERVICE],
})
export class WhatsAppMetricsModule {}
