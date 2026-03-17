import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { asHttpPostReturn } from '../test-utils/http-helpers';
import { WhatsAppService } from './whatsapp.service';
import {
  WhatsAppSandboxOptions,
  WhatsAppLiveOptions,
} from '../interfaces/whatsapp-client-options.interface';

const sandboxConfig: WhatsAppSandboxOptions = {
  mode: 'sandbox',
  testPhoneNumberId: '123',
  temporaryAccessToken: 'sandbox-token',
  testRecipients: ['+10000000000', '+111', '+200', '+333', '+555'],
};

const liveConfig: WhatsAppLiveOptions = {
  mode: 'live',
  businessAccountId: 'abc',
  phoneNumberId: '456',
  accessToken: 'live-token',
};

describe('WhatsAppService', () => {
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
  });

  it('should send text in live mode', async () => {
    jest.spyOn(httpService, 'post').mockReturnValue(of({ data: { messages: [{ id: 'msg-id' }] } }));
    await expect(service.sendText('+100', 'hello', 'live')).resolves.toEqual(expect.any(String));
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/456/messages',
      { messaging_product: 'whatsapp', to: '+100', type: 'text', text: { body: 'hello' } },
      expect.objectContaining({ headers: { Authorization: 'Bearer live-token' } })
    );
  });

  it('returns message ID from API response', async () => {
    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(of({ data: { messages: [{ id: 'wamid.abc123' }] } }));
    const id = await service.sendText('+100', 'hello', 'live');
    expect(id).toBe('wamid.abc123');
  });

  it('includes context when replyToMessageId provided', async () => {
    jest.spyOn(httpService, 'post').mockReturnValue(of({ data: { messages: [{ id: 'msg-id' }] } }));
    await service.sendText('+100', 'reply', 'live', 'original-msg-id');
    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ context: { message_id: 'original-msg-id' } }),
      expect.any(Object)
    );
  });

  it('should send media in sandbox mode', async () => {
    jest.spyOn(httpService, 'post').mockReturnValue(of({ data: { messages: [{ id: 'msg-id' }] } }));
    await expect(service.sendMedia('+200', 'http://media', 'caption', 'sandbox')).resolves.toEqual(
      expect.any(String)
    );
    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v17.0/123/messages',
      {
        messaging_product: 'whatsapp',
        to: '+200',
        type: 'image',
        image: { link: 'http://media', caption: 'caption' },
      },
      expect.objectContaining({ headers: { Authorization: 'Bearer sandbox-token' } })
    );
  });

  it('should throw error when client not configured', async () => {
    const noService: WhatsAppService = new WhatsAppService(httpService, undefined, undefined);
    await expect(noService.sendText('+300', 'hi')).rejects.toThrow();
  });

  it('maps 401/403 to WhatsAppAuthException', async () => {
    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(asHttpPostReturn(throwError(() => ({ response: { status: 401 } }))));
    await expect(service.sendText('+400', 'fail')).rejects.toMatchObject({
      name: 'WhatsAppAuthException',
    });
  });

  it('retries on 429 then succeeds', async () => {
    const mock = jest.spyOn(httpService, 'post');
    mock
      .mockReturnValueOnce(
        asHttpPostReturn(
          throwError(() => ({ response: { status: 429, headers: { 'retry-after': '0' } } }))
        )
      )
      .mockReturnValueOnce(of({ data: { messages: [{ id: 'msg-id' }] } }));
    await expect(service.sendText('+401', 'ok')).resolves.toEqual(expect.any(String));
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('fails after retries on 500', async () => {
    const mock = jest.spyOn(httpService, 'post');
    mock.mockReturnValue(asHttpPostReturn(throwError(() => ({ response: { status: 500 } }))));
    await expect(service.sendText('+402', 'ok')).rejects.toBeTruthy();
  });

  it('enforces sandbox testRecipients presence', async () => {
    const svc = new WhatsAppService(
      httpService,
      { ...sandboxConfig, testRecipients: [] },
      liveConfig
    );
    await expect(svc.sendText('+10000000001', 'hello', 'sandbox')).rejects.toMatchObject({
      name: 'WhatsAppSandboxRecipientException',
    });
  });

  it('rejects sandbox recipients outside allow-list', async () => {
    jest.spyOn(httpService, 'post').mockReturnValue(of({ data: { messages: [{ id: 'msg-id' }] } }));
    await expect(service.sendText('+19999999999', 'blocked', 'sandbox')).rejects.toMatchObject({
      name: 'WhatsAppSandboxRecipientException',
    });
  });
});
