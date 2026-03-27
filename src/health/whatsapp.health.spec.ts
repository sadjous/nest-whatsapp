import { HttpService } from '@nestjs/axios';
import { ModuleRef } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { WhatsAppHealthIndicator } from './whatsapp.health';
import { HealthCheckError } from '@nestjs/terminus';
import {
  WhatsAppMode,
  type WhatsAppSandboxOptions,
  type WhatsAppLiveOptions,
} from '../interfaces/whatsapp-client-options.interface';

const sandboxConfig: WhatsAppSandboxOptions = {
  mode: WhatsAppMode.SANDBOX,
  testPhoneNumberId: 'id',
  temporaryAccessToken: 'token',
  testRecipients: ['+100'],
};

const liveConfig: WhatsAppLiveOptions = {
  mode: WhatsAppMode.LIVE,
  businessAccountId: 'biz',
  phoneNumberId: 'pn',
  accessToken: 'token',
};

function makeModuleRef(sandbox?: WhatsAppSandboxOptions, live?: WhatsAppLiveOptions): ModuleRef {
  return {
    get: jest.fn((token: string) => {
      if (token === 'WHATSAPP_CLIENT_SANDBOX') {
        if (sandbox === undefined) throw new Error('not found');
        return sandbox;
      }
      if (token === 'WHATSAPP_CLIENT_LIVE') {
        if (live === undefined) throw new Error('not found');
        return live;
      }
      throw new Error(`Unknown token: ${token}`);
    }),
  } as unknown as ModuleRef;
}

describe('WhatsAppHealthIndicator', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fails fast when no client configured', async () => {
    const http = { get: jest.fn() } as unknown as HttpService;
    const indicator = new WhatsAppHealthIndicator(http, makeModuleRef());
    await expect(indicator.isHealthy('wa')).rejects.toBeInstanceOf(HealthCheckError);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('fails fast when sandbox credentials incomplete', async () => {
    const http = { get: jest.fn() } as unknown as HttpService;
    const incomplete = { ...sandboxConfig, testRecipients: [] };
    const indicator = new WhatsAppHealthIndicator(http, makeModuleRef(incomplete));
    await expect(indicator.isHealthy('wa')).rejects.toBeInstanceOf(HealthCheckError);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('fails fast when live credentials incomplete', async () => {
    const http = { get: jest.fn() } as unknown as HttpService;
    const incomplete = { ...liveConfig, accessToken: '' };
    const indicator = new WhatsAppHealthIndicator(http, makeModuleRef(undefined, incomplete));
    await expect(indicator.isHealthy('wa')).rejects.toBeInstanceOf(HealthCheckError);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('skips external call when skip flag set', async () => {
    const http = { get: jest.fn() } as unknown as HttpService;
    const originalEnv = process.env.WHATSAPP_HEALTH_SKIP_EXTERNAL;
    process.env.WHATSAPP_HEALTH_SKIP_EXTERNAL = 'true';
    try {
      const indicator = new WhatsAppHealthIndicator(http, makeModuleRef(sandboxConfig));
      const result = await indicator.isHealthy('wa');
      expect(result.wa.status).toBe('up');
      expect(http.get).not.toHaveBeenCalled();
    } finally {
      process.env.WHATSAPP_HEALTH_SKIP_EXTERNAL = originalEnv;
    }
  });

  it('performs shallow check with timeout when config present', async () => {
    const http = {
      get: jest.fn(() => of({ data: {} })),
    } as unknown as HttpService;
    const indicator = new WhatsAppHealthIndicator(http, makeModuleRef(undefined, liveConfig), {
      apiVersion: 'v18.0',
      httpTimeoutMs: 3000,
      httpRetries: 2,
      httpMaxRetryDelayMs: 5000,
      maskPhoneLogs: true,
      logMessageBodies: false,
    });
    const result = await indicator.isHealthy('wa');
    expect(result.wa.status).toBe('up');
    expect(http.get).toHaveBeenCalledWith(expect.stringContaining('graph.facebook.com'), {
      params: { fields: 'id' },
      timeout: expect.any(Number),
    });
  });

  it('reports failure when external check errors', async () => {
    const http = {
      get: jest.fn(() => throwError(() => new Error('boom'))),
    } as unknown as HttpService;
    const indicator = new WhatsAppHealthIndicator(http, makeModuleRef(undefined, liveConfig));
    await expect(indicator.isHealthy('wa')).rejects.toBeInstanceOf(HealthCheckError);
  });
});
