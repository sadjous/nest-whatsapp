import {
  Controller,
  Get,
  Post,
  Req,
  Headers,
  UnauthorizedException,
  Optional,
  PayloadTooLargeException,
} from '@nestjs/common';
import { WhatsAppEvents } from '../services/whatsapp.events';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as crypto from 'crypto';
import type {
  VerifyWebhookQuery,
  WhatsAppWebhookPayload,
  RawBodyRequestLike,
} from '../interfaces/webhook.interfaces';
import { WhatsAppMetricsService } from '../services/whatsapp.metrics';

@Controller('whatsapp/webhook')
export class WhatsAppController {
  constructor(
    private readonly events: WhatsAppEvents,
    private readonly configService: ConfigService,
    @Optional() private readonly metrics?: WhatsAppMetricsService
  ) {}

  @Get()
  verify(@Req() req: Request<Record<string, never>, unknown, unknown, VerifyWebhookQuery>): string {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const rawChallenge = req.query['hub.challenge'];
    if (
      mode === 'subscribe' &&
      token === this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
    ) {
      const challenge = typeof rawChallenge === 'string' ? rawChallenge : '';
      const MAX_CHALLENGE_LENGTH = 256;
      if (
        challenge.length === 0 ||
        challenge.length > MAX_CHALLENGE_LENGTH ||
        !/^[A-Za-z0-9._-]+$/.test(challenge)
      ) {
        throw new UnauthorizedException();
      }
      return challenge;
    }
    throw new UnauthorizedException();
  }

  @Post()
  receive(
    @Req() req: Request & RawBodyRequestLike<WhatsAppWebhookPayload, Record<string, never>>,
    @Headers('x-hub-signature-256') signature?: string
  ): string {
    const rawBody = req.rawBody as Buffer | undefined;
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');
    const maxBodyBytes = this.resolveMaxBodyBytes();
    if (!appSecret || !rawBody || !signature) {
      throw new UnauthorizedException();
    }
    if (rawBody.length > maxBodyBytes) {
      throw new PayloadTooLargeException(
        `Webhook payload exceeds ${maxBodyBytes} bytes, request rejected`
      );
    }
    // Enforce prefix and perform a timing-safe comparison of the HMAC
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
    this.metrics?.incrementWebhookEvents();
    return 'EVENT_RECEIVED';
  }

  private resolveMaxBodyBytes(): number {
    const fromConfig = this.configService.get<number | string>('WHATSAPP_WEBHOOK_MAX_BODY_BYTES');
    const parsed = Number(fromConfig ?? 2_000_000);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_000_000;
  }
}
