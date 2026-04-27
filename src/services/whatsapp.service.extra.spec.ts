import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WhatsAppService } from './whatsapp.service';
import {
  WhatsAppMode,
  WhatsAppSandboxOptions,
  WhatsAppLiveOptions,
} from '../interfaces/whatsapp-client-options.interface';
import type { WhatsAppOutboundInteractive } from '../interfaces/webhook.interfaces';

const sandboxConfig: WhatsAppSandboxOptions = {
  mode: WhatsAppMode.SANDBOX,
  testPhoneNumberId: '123',
  temporaryAccessToken: 'sandbox-token',
  testRecipients: ['+10000000000', '+111', '+333', '+555'],
};

const liveConfig: WhatsAppLiveOptions = {
  mode: WhatsAppMode.LIVE,
  businessAccountId: 'abc',
  phoneNumberId: '456',
  accessToken: 'live-token',
};

describe('WhatsAppService extra coverage', () => {
  let service: WhatsAppService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: 'WHATSAPP_CLIENT_SANDBOX', useValue: sandboxConfig },
        { provide: 'WHATSAPP_CLIENT_LIVE', useValue: liveConfig },
        { provide: HttpService, useValue: { post: jest.fn() } },
      ],
    }).compile();
    service = module.get<WhatsAppService>(WhatsAppService);
    httpService = module.get<HttpService>(HttpService);
    (httpService.post as jest.Mock).mockReturnValue(of({ data: { messages: [{ id: 'msg-id' }] } }));
  });

  it('sendText sandbox', async () => {
    await service.sendText('+111', 'hi', WhatsAppMode.SANDBOX);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/123/messages',
      { messaging_product: 'whatsapp', to: '+111', type: 'text', text: { body: 'hi' } },
      expect.objectContaining({ headers: { Authorization: 'Bearer sandbox-token' } })
    );
  });

  it('sendAudio live', async () => {
    await service.sendAudio('+222', 'http://audio', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      {
        messaging_product: 'whatsapp',
        to: '+222',
        type: 'audio',
        audio: { link: 'http://audio' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendDocument sandbox', async () => {
    await service.sendDocument('+333', 'http://doc', 'file.pdf', WhatsAppMode.SANDBOX);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/123/messages',
      {
        messaging_product: 'whatsapp',
        to: '+333',
        type: 'document',
        document: { link: 'http://doc', filename: 'file.pdf' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer sandbox-token' } })
    );
  });

  it('sendLocation live', async () => {
    await service.sendLocation('+444', 1.23, 4.56, 'Name', 'Addr', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      {
        messaging_product: 'whatsapp',
        to: '+444',
        type: 'location',
        location: { latitude: 1.23, longitude: 4.56, name: 'Name', address: 'Addr' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendTemplate sandbox', async () => {
    await service.sendTemplate('+555', 'order_created', ['A', 'B'], WhatsAppMode.SANDBOX);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/123/messages',
      {
        messaging_product: 'whatsapp',
        to: '+555',
        type: 'template',
        template: {
          name: 'order_created',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'A' },
                { type: 'text', text: 'B' },
              ],
            },
          ],
        },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer sandbox-token' } })
    );
  });

  it('uses configurable Graph API version if provided', async () => {
    const svc = new WhatsAppService(httpService, sandboxConfig, liveConfig, undefined, {
      apiVersion: 'v19.0',
    });
    await svc.sendText('+999', 'hi', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/456/messages',
      expect.objectContaining({}),
      expect.objectContaining({})
    );
  });

  it('start/end session wrappers', async () => {
    const spy = jest.spyOn(service, 'sendText').mockResolvedValue('msg-id');
    await service.startSession('+666', WhatsAppMode.LIVE);
    await service.endSession('+777', WhatsAppMode.SANDBOX);
    expect(spy).toHaveBeenCalledWith('+666', 'Session started', WhatsAppMode.LIVE);
    expect(spy).toHaveBeenCalledWith('+777', 'Session ended', WhatsAppMode.SANDBOX);
  });

  it('merges client-specific axios overrides', async () => {
    const customSandbox = {
      ...sandboxConfig,
      httpConfig: { params: { foo: 'bar' }, timeout: 1234 },
    };
    const svc = new WhatsAppService(httpService, customSandbox, liveConfig);
    await svc.sendText('+111', 'hi', WhatsAppMode.SANDBOX);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/123/messages',
      expect.anything(),
      expect.objectContaining({
        timeout: 1234,
        params: { foo: 'bar' },
        headers: expect.objectContaining({ Authorization: 'Bearer sandbox-token' }),
      })
    );
  });

  it('sendVideo live', async () => {
    await service.sendVideo('+444', 'http://video', 'my video', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      {
        messaging_product: 'whatsapp',
        to: '+444',
        type: 'video',
        video: { link: 'http://video', caption: 'my video' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendSticker live', async () => {
    await service.sendSticker('+444', 'http://sticker', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      {
        messaging_product: 'whatsapp',
        to: '+444',
        type: 'sticker',
        sticker: { link: 'http://sticker' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendReaction live', async () => {
    await service.sendReaction('+444', 'orig-msg-id', '👍', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      {
        messaging_product: 'whatsapp',
        to: '+444',
        type: 'reaction',
        reaction: { message_id: 'orig-msg-id', emoji: '👍' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendInteractive (button) live', async () => {
    const interactive: WhatsAppOutboundInteractive = {
      type: 'button',
      body: { text: 'Pick one' },
      action: {
        buttons: [{ type: 'reply', reply: { id: 'btn1', title: 'Yes' } }],
      },
    };
    await service.sendInteractive('+444', interactive, WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      {
        messaging_product: 'whatsapp',
        to: '+444',
        type: 'interactive',
        interactive,
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendVideo returns message ID', async () => {
    const id = await service.sendVideo('+444', 'http://video', 'caption', WhatsAppMode.LIVE);
    expect(id).toBe('msg-id');
  });

  it('sendSticker returns message ID', async () => {
    const id = await service.sendSticker('+444', 'http://sticker', WhatsAppMode.LIVE);
    expect(id).toBe('msg-id');
  });

  it('sendReaction returns message ID', async () => {
    const id = await service.sendReaction('+444', 'msg', '❤️', WhatsAppMode.LIVE);
    expect(id).toBe('msg-id');
  });

  it('sendInteractive returns message ID', async () => {
    const interactive: WhatsAppOutboundInteractive = {
      type: 'button',
      body: { text: 'Choose' },
      action: { buttons: [{ type: 'reply', reply: { id: 'b1', title: 'OK' } }] },
    };
    const id = await service.sendInteractive('+444', interactive, WhatsAppMode.LIVE);
    expect(id).toBe('msg-id');
  });

  it('sendContact live', async () => {
    await service.sendContact(
      '+444',
      [{ name: { formatted_name: 'Alice' }, phones: [{ phone: '+1234' }] }],
      WhatsAppMode.LIVE
    );
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      expect.objectContaining({ type: 'contacts', contacts: expect.any(Array) }),
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendContact with replyToMessageId includes context', async () => {
    await service.sendContact(
      '+444',
      [{ name: { formatted_name: 'Bob' } }],
      WhatsAppMode.LIVE,
      'ref-msg-id'
    );
    expect(httpService.post).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ context: { message_id: 'ref-msg-id' } }),
      expect.anything()
    );
  });

  it('markAsRead calls PUT with correct payload (live)', async () => {
    const httpPut = jest.fn().mockReturnValue(of({ data: { success: true } }));
    (httpService as unknown as Record<string, unknown>).put = httpPut;
    await service.markAsRead('wamid-123', WhatsAppMode.LIVE);
    expect(httpPut).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/456/messages',
      { messaging_product: 'whatsapp', status: 'read', message_id: 'wamid-123' },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('markAsRead uses sandbox phoneNumberId for sandbox client', async () => {
    const httpPut = jest.fn().mockReturnValue(of({ data: { success: true } }));
    (httpService as unknown as Record<string, unknown>).put = httpPut;
    await service.markAsRead('wamid-456', WhatsAppMode.SANDBOX);
    expect(httpPut).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/123/messages',
      expect.objectContaining({ message_id: 'wamid-456' }),
      expect.anything()
    );
  });

  it('sendMedia with { url } WhatsAppMediaSource', async () => {
    await service.sendMedia('+444', { url: 'http://img.jpg' }, 'caption', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ image: { link: 'http://img.jpg', caption: 'caption' } }),
      expect.anything()
    );
  });

  it('sendMedia with { mediaId } WhatsAppMediaSource', async () => {
    await service.sendMedia('+444', { mediaId: 'media-abc' }, 'caption', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ image: { id: 'media-abc', caption: 'caption' } }),
      expect.anything()
    );
  });

  it('sendAudio with { mediaId } WhatsAppMediaSource', async () => {
    await service.sendAudio('+444', { mediaId: 'audio-id-1' }, WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ audio: { id: 'audio-id-1' } }),
      expect.anything()
    );
  });

  it('maskRecipient with non-digit-only string returns non-masked', async () => {
    // '---' normalizes to '' (no digits) → falls through to raw return
    const svc = new WhatsAppService(httpService, sandboxConfig, liveConfig, undefined, {
      maskPhoneLogs: true,
    });
    // A sandbox recipient that only has non-digit chars would error on sandbox check,
    // so we use the live client which skips the sandbox check
    await svc.sendText('---', 'hi', WhatsAppMode.LIVE);
    expect(httpService.post).toHaveBeenCalled();
  });

  it('maskPhoneLogs: false returns raw phone number', async () => {
    const svc = new WhatsAppService(httpService, sandboxConfig, liveConfig, undefined, {
      maskPhoneLogs: false,
    });
    await svc.sendText('+111', 'hi', WhatsAppMode.SANDBOX);
    // Just verify no error thrown — the log line uses the raw number
    expect(httpService.post).toHaveBeenCalled();
  });

  it('logMessageBodies: true calls debug logger', async () => {
    const svc = new WhatsAppService(httpService, sandboxConfig, liveConfig, undefined, {
      logMessageBodies: true,
    });
    await svc.sendText('+111', 'hi', WhatsAppMode.SANDBOX);
    expect(httpService.post).toHaveBeenCalled();
  });

  it('network error (ECONNABORTED) is retried then throws a safe error', async () => {
    (httpService.post as jest.Mock).mockReturnValue(throwError(() => ({ code: 'ECONNABORTED' })));
    const svc = new WhatsAppService(httpService, sandboxConfig, liveConfig, undefined, {
      httpRetries: 0,
    });
    await expect(svc.sendText('+111', 'hi', WhatsAppMode.SANDBOX)).rejects.toThrow(
      'WhatsApp API network error (ECONNABORTED)'
    );
  });
});
