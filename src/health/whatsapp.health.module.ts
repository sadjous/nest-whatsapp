import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppHealthIndicator } from './whatsapp.health';
import { WhatsAppMediaService } from '../services/whatsapp.media.service';
import { WhatsAppTemplatesService } from '../services/whatsapp.templates.service';
import { WhatsAppPhoneNumbersService } from '../services/whatsapp.phone-numbers.service';

@Module({
  imports: [HttpModule],
  providers: [
    WhatsAppHealthIndicator,
    WhatsAppMediaService,
    WhatsAppTemplatesService,
    WhatsAppPhoneNumbersService,
  ],
  exports: [WhatsAppHealthIndicator],
})
export class WhatsAppHealthModule {}
