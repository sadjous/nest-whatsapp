import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WhatsAppService } from 'nest-whatsapp';
import type { WhatsAppMode } from '../../../src/interfaces/whatsapp-client-options.interface';
import {
  SendDocumentDto,
  SendLocationDto,
  SendMediaDto,
  SendTemplateDto,
  SendTextDto,
} from './dto/message.dto';

@Controller()
export class WaController {
  constructor(private readonly wa: WhatsAppService) {}

  @MessagePattern('wa.sendText')
  async sendText(@Payload() data: SendTextDto) {
    const mode: WhatsAppMode =
      data.mode ?? (process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live');
    await this.wa.sendText(data.to, data.message, mode);
    return { ok: true };
  }

  @MessagePattern('wa.sendTemplate')
  async sendTemplate(@Payload() data: SendTemplateDto) {
    const mode: WhatsAppMode =
      data.mode ?? (process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live');
    await this.wa.sendTemplate(data.to, data.templateName, data.variables ?? [], mode);
    return { ok: true };
  }

  @MessagePattern('wa.sendMedia')
  async sendMedia(@Payload() data: SendMediaDto) {
    const mode: WhatsAppMode =
      data.mode ?? (process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live');
    await this.wa.sendMedia(data.to, data.mediaUrl, data.caption ?? '', mode);
    return { ok: true };
  }

  @MessagePattern('wa.sendDocument')
  async sendDocument(@Payload() data: SendDocumentDto) {
    const mode: WhatsAppMode =
      data.mode ?? (process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live');
    await this.wa.sendDocument(data.to, data.documentUrl, data.filename, mode);
    return { ok: true };
  }

  @MessagePattern('wa.sendLocation')
  async sendLocation(@Payload() data: SendLocationDto) {
    const mode: WhatsAppMode =
      data.mode ?? (process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live');
    await this.wa.sendLocation(
      data.to,
      data.latitude,
      data.longitude,
      data.name,
      data.address,
      mode
    );
    return { ok: true };
  }
}
