import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import { EventEmitter2 } from 'eventemitter2';
import { WhatsAppEvents, WHATSAPP_EVENT_EMITTER } from '../services/whatsapp.events';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  VerifyWebhookQuery,
  RawBodyRequestLike,
  WhatsAppWebhookPayload,
} from '../interfaces/webhook.interfaces';
import type { Request } from 'express';
import { WhatsAppMetricsService } from '../services/whatsapp.metrics';
import { unsafeCast } from '../test-utils/type-helpers';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let eventEmitter: EventEmitter2;
  let configService: ConfigService;
  let metrics: WhatsAppMetricsService;
  let configValues: Record<string, unknown>;

  beforeEach(async () => {
    eventEmitter = new EventEmitter2();
    configValues = {};
    configService = unsafeCast<ConfigService>({
      get: jest.fn((key: string) => configValues[key]),
    });
    metrics = { incrementWebhookEvents: jest.fn() } as unknown as WhatsAppMetricsService;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        { provide: WHATSAPP_EVENT_EMITTER, useValue: eventEmitter },
        WhatsAppEvents,
        { provide: ConfigService, useValue: configService },
        { provide: WhatsAppMetricsService, useValue: metrics },
      ],
    }).compile();
    controller = module.get<WhatsAppController>(WhatsAppController);
  });

  it('should verify webhook', () => {
    configValues['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] = 'verify-token';
    const req = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-token',
        'hub.challenge': 'challenge',
      } satisfies VerifyWebhookQuery,
    } as Request<Record<string, never>, unknown, unknown, VerifyWebhookQuery>;
    expect(controller.verify(req)).toEqual('challenge');
  });

  it('should reject verification with wrong token', () => {
    configValues['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] = 'verify-token';
    const req = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong',
        'hub.challenge': 'x',
      } as VerifyWebhookQuery,
    } as Request<Record<string, never>, unknown, unknown, VerifyWebhookQuery>;
    expect(() => controller.verify(req)).toThrow();
  });

  it('should receive and emit event on valid signature', () => {
    configValues['WHATSAPP_APP_SECRET'] = 'app-secret';
    const body = { test: 'data' };
    const rawBody = Buffer.from(JSON.stringify(body));
    const signature =
      'sha256=' + crypto.createHmac('sha256', 'app-secret').update(rawBody).digest('hex');
    const req = unsafeCast<
      Request & RawBodyRequestLike<WhatsAppWebhookPayload, Record<string, never>>
    >({ body, rawBody });
    const spy = jest.spyOn(eventEmitter, 'emit');
    expect(controller.receive(req, signature)).toEqual('EVENT_RECEIVED');
    expect(spy).toHaveBeenCalledWith('whatsapp.message_received', body);
    expect(metrics.incrementWebhookEvents).toHaveBeenCalled();
  });

  it('should reject invalid signature', () => {
    configValues['WHATSAPP_APP_SECRET'] = 'app-secret';
    const req = unsafeCast<
      Request & RawBodyRequestLike<WhatsAppWebhookPayload, Record<string, never>>
    >({ body: {}, rawBody: Buffer.from('x') });
    expect(() => controller.receive(req, 'bad')).toThrow();
  });

  it('should reject signature with wrong prefix or invalid hex/length', () => {
    configValues['WHATSAPP_APP_SECRET'] = 'app-secret';
    const rawBody = Buffer.from('body');
    const req = unsafeCast<
      Request & RawBodyRequestLike<WhatsAppWebhookPayload, Record<string, never>>
    >({ body: {}, rawBody });
    // Wrong prefix
    expect(() => controller.receive(req, 'sha1=deadbeef')).toThrow();
    // Correct prefix but wrong hex length / invalid digest
    expect(() => controller.receive(req, 'sha256=deadbeef')).toThrow();
  });

  it('should reject when missing signature/appSecret/rawBody', () => {
    const req = unsafeCast<
      Request & RawBodyRequestLike<WhatsAppWebhookPayload, Record<string, never>>
    >({ body: {}, rawBody: Buffer.from('x') });
    expect(() => controller.receive(req, undefined)).toThrow();
  });

  it('should reject when payload exceeds configured limit', () => {
    configValues['WHATSAPP_APP_SECRET'] = 'app-secret';
    configValues['WHATSAPP_WEBHOOK_MAX_BODY_BYTES'] = 1;
    const rawBody = Buffer.from([0, 1]);
    const signature =
      'sha256=' + crypto.createHmac('sha256', 'app-secret').update(rawBody).digest('hex');
    const req = unsafeCast<
      Request & RawBodyRequestLike<WhatsAppWebhookPayload, Record<string, never>>
    >({ body: {}, rawBody });
    expect(() => controller.receive(req, signature)).toThrow('payload exceeds');
  });

  it('should reject verification when challenge is missing', () => {
    configValues['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] = 'verify-token';
    const req = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-token',
        // no 'hub.challenge'
      } as VerifyWebhookQuery,
    } as Request<Record<string, never>, unknown, unknown, VerifyWebhookQuery>;
    expect(() => controller.verify(req)).toThrow();
  });
});
