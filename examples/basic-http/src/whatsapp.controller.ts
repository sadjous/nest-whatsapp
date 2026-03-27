import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { WhatsAppService, WhatsAppMode } from '@softzenit/nest-whatsapp';
import type { WhatsAppContactCard } from '@softzenit/nest-whatsapp';

@Controller('messages')
export class WhatsAppController {
  constructor(private readonly wa: WhatsAppService) {}

  private get mode(): WhatsAppMode {
    return process.env.WHATSAPP_MODE === 'sandbox' ? WhatsAppMode.SANDBOX : WhatsAppMode.LIVE;
  }

  @Post('text')
  sendText(@Body() body: { to: string; message: string }) {
    return this.wa.sendText(body.to, body.message, this.mode);
  }

  @Post('media')
  sendMedia(@Body() body: { to: string; url: string; caption?: string }) {
    return this.wa.sendMedia(body.to, body.url, body.caption ?? '', this.mode);
  }

  @Post('audio')
  sendAudio(@Body() body: { to: string; url: string }) {
    return this.wa.sendAudio(body.to, body.url, this.mode);
  }

  @Post('document')
  sendDocument(@Body() body: { to: string; url: string; filename?: string }) {
    return this.wa.sendDocument(body.to, body.url, body.filename ?? 'document', this.mode);
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
    return this.wa.sendLocation(
      body.to,
      Number(body.latitude),
      Number(body.longitude),
      body.name ?? '',
      body.address ?? '',
      this.mode
    );
  }

  @Post('template')
  sendTemplate(@Body() body: { to: string; templateName: string; variables?: string[] }) {
    return this.wa.sendTemplate(body.to, body.templateName, body.variables ?? [], this.mode);
  }

  /**
   * Send a contact card.
   * Body: { to, contacts: WhatsAppContactCard[] }
   */
  @Post('contact')
  sendContact(@Body() body: { to: string; contacts: WhatsAppContactCard[] }) {
    return this.wa.sendContact(body.to, body.contacts, this.mode);
  }

  /**
   * Mark a message as read.
   * Body: { messageId }
   */
  @Post('read')
  @HttpCode(200)
  async markAsRead(@Body() body: { messageId: string }) {
    await this.wa.markAsRead(body.messageId, this.mode);
    return { ok: true };
  }

  @Post('start-session')
  startSession(@Body() body: { to: string }) {
    return this.wa.startSession(body.to, this.mode);
  }

  @Post('end-session')
  endSession(@Body() body: { to: string }) {
    return this.wa.endSession(body.to, this.mode);
  }
}
