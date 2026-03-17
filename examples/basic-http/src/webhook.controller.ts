import { Controller, Get, Post, Req, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { WhatsAppEvents } from '@sadjous/nest-whatsapp';
import type {
  VerifyWebhookQuery,
  WhatsAppWebhookPayload,
  RawBodyRequestLike,
} from '../../../src/interfaces/webhook.interfaces';

@Controller('whatsapp/webhook')
export class WebhookController {
  constructor(
    private readonly events: WhatsAppEvents,
    private readonly config: ConfigService
  ) {}

  private sanitizeChallenge(challenge: string | undefined): string {
    if (!challenge) return '';
    return challenge.replace(/[^0-9A-Za-z=_-]/g, '');
  }

  @Get()
  verify(@Req() req: Request<Record<string, never>, unknown, unknown, VerifyWebhookQuery>): string {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'] as string | undefined;
    if (
      mode === 'subscribe' &&
      token === this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
    ) {
      return this.sanitizeChallenge(challenge);
    }
    throw new UnauthorizedException();
  }

  @Post()
  receive(
    @Req() req: Request & RawBodyRequestLike<WhatsAppWebhookPayload, Record<string, never>>,
    @Headers('x-hub-signature-256') signature?: string
  ): string {
    const rawBody = req.rawBody as Buffer | undefined;
    const appSecret = this.config.get<string>('WHATSAPP_APP_SECRET');
    if (!appSecret || !rawBody || !signature) {
      throw new UnauthorizedException();
    }
    const prefix = 'sha256=';
    if (!signature.startsWith(prefix)) {
      throw new UnauthorizedException();
    }
    const providedHex = signature.slice(prefix.length);
    const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const provided = Buffer.from(providedHex, 'hex');
    const expected = Buffer.from(expectedHex, 'hex');
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException();
    }
    this.events.emitMessageReceived(req.body);
    return 'EVENT_RECEIVED';
  }
}
