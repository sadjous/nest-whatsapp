import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WhatsAppHealthIndicator } from './whatsapp.health';
import { HealthCheckError } from '@nestjs/terminus';

describe('WhatsAppHealthIndicator', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  it('fails fast when required config missing', async () => {
    const http = { get: jest.fn() } as unknown as HttpService;
    delete process.env.WHATSAPP_MODE;
    const indicator = new WhatsAppHealthIndicator(http);
    await expect(indicator.isHealthy('wa')).rejects.toBeInstanceOf(HealthCheckError);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('skips external call when skip flag set', async () => {
    const http = { get: jest.fn() } as unknown as HttpService;
    process.env.WHATSAPP_MODE = 'sandbox';
    process.env.WHATSAPP_SANDBOX_PHONE_NUMBER_ID = 'id';
    process.env.WHATSAPP_SANDBOX_ACCESS_TOKEN = 'token';
    process.env.WHATSAPP_SANDBOX_TEST_RECIPIENTS = '+100';
    process.env.WHATSAPP_HEALTH_SKIP_EXTERNAL = 'true';
    const indicator = new WhatsAppHealthIndicator(http);
    const result = await indicator.isHealthy('wa');
    expect(result.wa.status).toBe('up');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('performs shallow check with timeout when config present', async () => {
    const http = {
      get: jest.fn(() => of({ data: {} })),
    } as unknown as HttpService;
    process.env.WHATSAPP_MODE = 'live';
    process.env.WHATSAPP_LIVE_PHONE_NUMBER_ID = 'pn';
    process.env.WHATSAPP_LIVE_ACCESS_TOKEN = 'token';
    const indicator = new WhatsAppHealthIndicator(http);
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
    process.env.WHATSAPP_MODE = 'live';
    process.env.WHATSAPP_LIVE_PHONE_NUMBER_ID = 'pn';
    process.env.WHATSAPP_LIVE_ACCESS_TOKEN = 'token';
    const indicator = new WhatsAppHealthIndicator(http);
    await expect(indicator.isHealthy('wa')).rejects.toBeInstanceOf(HealthCheckError);
  });
});
