import {
  Controller,
  Get,
  Post,
  Req,
  Headers,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Optional,
  PayloadTooLargeException,
} from '@nestjs/common';
import { WhatsAppEvents } from '../services/whatsapp.events';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as crypto from 'node:crypto';
import type {
  VerifyWebhookQuery,
  WhatsAppWebhookPayload,
  RawBodyRequestLike,
} from '../interfaces/webhook.interfaces';
import {
  WHATSAPP_METRICS_SERVICE,
  type IWhatsAppMetrics,
} from '../interfaces/whatsapp-metrics.interface';

@Controller('whatsapp/webhook')
export class WhatsAppController {
  constructor(
    private readonly events: WhatsAppEvents,
    @Optional() private readonly configService?: ConfigService,
    @Optional() @Inject(WHATSAPP_METRICS_SERVICE) private readonly metrics?: IWhatsAppMetrics
  ) {}

  @Get()
  verify(@Req() req: Request<Record<string, never>, unknown, unknown, VerifyWebhookQuery>): string {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const rawChallenge = req.query['hub.challenge'];
    if (
      mode === 'subscribe' &&
      token ===
        (this.configService?.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ??
          process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'])
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
    const appSecret =
      this.configService?.get<string>('WHATSAPP_APP_SECRET') ?? process.env['WHATSAPP_APP_SECRET'];
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
    this.validateWebhookPayload(req.body);
    this.events.emitMessageReceived(req.body);
    this.metrics?.incrementWebhookEvents();
    return 'EVENT_RECEIVED';
  }

  private validateWebhookPayload(body: WhatsAppWebhookPayload): void {
    if (body?.object !== 'whatsapp_business_account') {
      throw new BadRequestException('Invalid webhook: unexpected object value');
    }
    if (!Array.isArray(body?.entry) || body.entry.length === 0) {
      throw new BadRequestException('Invalid webhook: entry must be a non-empty array');
    }
    for (const entry of body.entry) {
      if (!Array.isArray(entry?.changes) || entry.changes.length === 0) {
        throw new BadRequestException('Invalid webhook: changes must be a non-empty array');
      }
      for (const change of entry.changes) {
        if (change?.value?.messaging_product !== 'whatsapp') {
          throw new BadRequestException('Invalid webhook: messaging_product must be "whatsapp"');
        }
      }
    }
  }

  private resolveMaxBodyBytes(): number {
    const fromConfig =
      this.configService?.get<number | string>('WHATSAPP_WEBHOOK_MAX_BODY_BYTES') ??
      process.env['WHATSAPP_WEBHOOK_MAX_BODY_BYTES'];
    const parsed = Number(fromConfig ?? 2_000_000);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_000_000;
  }
}
