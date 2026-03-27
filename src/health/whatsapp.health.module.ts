import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppHealthIndicator } from './whatsapp.health';

@Module({
  imports: [HttpModule],
  providers: [WhatsAppHealthIndicator],
  exports: [WhatsAppHealthIndicator],
})
export class WhatsAppHealthModule {}
