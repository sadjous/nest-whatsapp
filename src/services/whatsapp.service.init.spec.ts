import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WhatsAppService } from './whatsapp.service';
import type {
  WhatsAppLiveOptions,
  WhatsAppSandboxOptions,
} from '../interfaces/whatsapp-client-options.interface';
import { unsafeCast } from '../test-utils/type-helpers';

describe('WhatsAppService onModuleInit', () => {
  const http = unsafeCast<HttpService>({});
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs sandbox only', () => {
    const sandbox: WhatsAppSandboxOptions = {
      mode: 'sandbox',
      testPhoneNumberId: 'id',
      temporaryAccessToken: 'tok',
      testRecipients: [],
    };
    const svc = new WhatsAppService(http, sandbox, undefined);
    svc.onModuleInit();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('sandbox'));
  });

  it('logs live only', () => {
    const live: WhatsAppLiveOptions = {
      mode: 'live',
      businessAccountId: 'b',
      phoneNumberId: 'p',
      accessToken: 't',
    };
    const svc = new WhatsAppService(http, undefined, live);
    svc.onModuleInit();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('live'));
  });

  it('warns when none configured', () => {
    const svc = new WhatsAppService(http, undefined, undefined);
    svc.onModuleInit();
    expect(warnSpy).toHaveBeenCalled();
  });
});
