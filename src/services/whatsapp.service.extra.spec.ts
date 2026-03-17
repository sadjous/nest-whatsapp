import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { WhatsAppService } from './whatsapp.service';
import {
  WhatsAppSandboxOptions,
  WhatsAppLiveOptions,
} from '../interfaces/whatsapp-client-options.interface';
import type { WhatsAppOutboundInteractive } from '../interfaces/webhook.interfaces';

const sandboxConfig: WhatsAppSandboxOptions = {
  mode: 'sandbox',
  testPhoneNumberId: '123',
  temporaryAccessToken: 'sandbox-token',
  testRecipients: ['+10000000000', '+111', '+333', '+555'],
};

const liveConfig: WhatsAppLiveOptions = {
  mode: 'live',
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
    await service.sendText('+111', 'hi', 'sandbox');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/123/messages',
      { messaging_product: 'whatsapp', to: '+111', type: 'text', text: { body: 'hi' } },
      expect.objectContaining({ headers: { Authorization: 'Bearer sandbox-token' } })
    );
  });

  it('sendAudio live (includes caption)', async () => {
    await service.sendAudio('+222', 'http://audio', 'cap', 'live');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/456/messages',
      {
        messaging_product: 'whatsapp',
        to: '+222',
        type: 'audio',
        audio: { link: 'http://audio', caption: 'cap' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('sendDocument sandbox', async () => {
    await service.sendDocument('+333', 'http://doc', 'file.pdf', 'sandbox');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/123/messages',
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
    await service.sendLocation('+444', 1.23, 4.56, 'Name', 'Addr', 'live');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/456/messages',
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
    await service.sendTemplate('+555', 'order_created', ['A', 'B'], 'sandbox');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/123/messages',
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
    await svc.sendText('+999', 'hi', 'live');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/456/messages',
      expect.objectContaining({}),
      expect.objectContaining({})
    );
  });

  it('start/end session wrappers', async () => {
    const spy = jest.spyOn(service, 'sendText').mockResolvedValue('msg-id');
    await service.startSession('+666', 'live');
    await service.endSession('+777', 'sandbox');
    expect(spy).toHaveBeenCalledWith('+666', 'Session started', 'live');
    expect(spy).toHaveBeenCalledWith('+777', 'Session ended', 'sandbox');
  });

  it('merges client-specific axios overrides', async () => {
    const customSandbox = {
      ...sandboxConfig,
      httpConfig: { params: { foo: 'bar' }, timeout: 1234 },
    };
    const svc = new WhatsAppService(httpService, customSandbox, liveConfig);
    await svc.sendText('+111', 'hi', 'sandbox');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/123/messages',
      expect.anything(),
      expect.objectContaining({
        timeout: 1234,
        params: { foo: 'bar' },
        headers: expect.objectContaining({ Authorization: 'Bearer sandbox-token' }),
      })
    );
  });

  it('sendVideo live', async () => {
    await service.sendVideo('+444', 'http://video', 'my video', 'live');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/456/messages',
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
    await service.sendSticker('+444', 'http://sticker', 'live');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/456/messages',
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
    await service.sendReaction('+444', 'orig-msg-id', '👍', 'live');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/456/messages',
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
    await service.sendInteractive('+444', interactive, 'live');
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/456/messages',
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
    const id = await service.sendVideo('+444', 'http://video', 'caption', 'live');
    expect(id).toBe('msg-id');
  });

  it('sendSticker returns message ID', async () => {
    const id = await service.sendSticker('+444', 'http://sticker', 'live');
    expect(id).toBe('msg-id');
  });

  it('sendReaction returns message ID', async () => {
    const id = await service.sendReaction('+444', 'msg', '❤️', 'live');
    expect(id).toBe('msg-id');
  });

  it('sendInteractive returns message ID', async () => {
    const interactive: WhatsAppOutboundInteractive = {
      type: 'button',
      body: { text: 'Choose' },
      action: { buttons: [{ type: 'reply', reply: { id: 'b1', title: 'OK' } }] },
    };
    const id = await service.sendInteractive('+444', interactive, 'live');
    expect(id).toBe('msg-id');
  });
});
