import { Controller, Post, Body } from '@nestjs/common';
import { WhatsAppService } from 'nest-whatsapp';
import type { WhatsAppMode } from '../../../src/interfaces/whatsapp-client-options.interface';

@Controller('messages')
export class WhatsAppController {
  constructor(private readonly wa: WhatsAppService) {}

  @Post('text')
  sendText(@Body() body: { to: string; message: string }) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.sendText(body.to, body.message, mode);
  }

  @Post('media')
  sendMedia(@Body() body: { to: string; url: string; caption?: string }) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.sendMedia(body.to, body.url, body.caption ?? '', mode);
  }

  @Post('audio')
  sendAudio(@Body() body: { to: string; url: string }) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.sendAudio(body.to, body.url, mode);
  }

  @Post('document')
  sendDocument(@Body() body: { to: string; url: string; filename?: string }) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.sendDocument(body.to, body.url, body.filename ?? 'document', mode);
  }

  @Post('location')
  sendLocation(
    @Body()
    body: {
      to: string;
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }
  ) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.sendLocation(
      body.to,
      Number(body.latitude),
      Number(body.longitude),
      body.name ?? '',
      body.address ?? '',
      mode
    );
  }

  @Post('template')
  sendTemplate(@Body() body: { to: string; templateName: string; variables?: string[] }) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.sendTemplate(body.to, body.templateName, body.variables ?? [], mode);
  }

  @Post('start-session')
  startSession(@Body() body: { to: string }) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.startSession(body.to, mode);
  }

  @Post('end-session')
  endSession(@Body() body: { to: string }) {
    const mode: WhatsAppMode = process.env.WHATSAPP_MODE === 'sandbox' ? 'sandbox' : 'live';
    return this.wa.endSession(body.to, mode);
  }
}
