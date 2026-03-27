import { Module } from '@nestjs/common';
import { WhatsAppMetricsService } from '../services/whatsapp.metrics';

@Module({
  providers: [WhatsAppMetricsService],
  exports: [WhatsAppMetricsService],
})
export class WhatsAppMetricsModule {}
