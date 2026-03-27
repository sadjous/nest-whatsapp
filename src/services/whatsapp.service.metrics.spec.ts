import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WhatsAppService } from './whatsapp.service';
import { WHATSAPP_METRICS_SERVICE } from '../interfaces/whatsapp-metrics.interface';
import type { IWhatsAppMetrics } from '../interfaces/whatsapp-metrics.interface';
import type { WhatsAppLiveOptions } from '../interfaces/whatsapp-client-options.interface';

describe('WhatsAppService metrics', () => {
  const liveConfig: WhatsAppLiveOptions = {
    mode: 'live',
    businessAccountId: 'ba',
    phoneNumberId: 'pn',
    accessToken: 'tk',
  };

  let service: WhatsAppService;
  let http: HttpService;
  const metrics = {
    incrementMessagesSent: jest.fn(),
    incrementErrors: jest.fn(),
    incrementWebhookEvents: jest.fn(),
    startRequestTimer: jest.fn(),
  } as unknown as IWhatsAppMetrics;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.WHATSAPP_HTTP_RETRIES;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: 'WHATSAPP_CLIENT_LIVE', useValue: liveConfig },
        { provide: HttpService, useValue: { post: jest.fn() } },
        { provide: WHATSAPP_METRICS_SERVICE, useValue: metrics },
      ],
    }).compile();
    service = module.get(WhatsAppService);
    http = module.get(HttpService);
  });

  it('records success counters and duration', async () => {
    const end = jest.fn();
    (http.post as jest.Mock).mockReturnValue(of({ data: {} }));
    jest.spyOn(metrics, 'startRequestTimer').mockReturnValue(end);
    await service.sendText('+1', 'ok', 'live');
    expect(metrics.incrementMessagesSent).toHaveBeenCalledWith('text', 'live');
    expect(metrics.startRequestTimer).toHaveBeenCalledWith('text', 'live');
    expect(end).toHaveBeenCalledWith({ status: 'success' });
  });

  it('records error counters and duration for 429', async () => {
    const end = jest.fn();
    process.env.WHATSAPP_HTTP_RETRIES = '0';
    (http.post as jest.Mock).mockReturnValue(
      throwError(() => ({ response: { status: 429, headers: { 'retry-after': '0' } } }))
    );
    jest.spyOn(metrics, 'startRequestTimer').mockReturnValue(end);
    await expect(service.sendText('+1', 'ok', 'live')).rejects.toBeTruthy();
    expect(metrics.incrementErrors).toHaveBeenCalledWith('text', 'live', '429');
    expect(metrics.startRequestTimer).toHaveBeenCalledWith('text', 'live');
    expect(end).toHaveBeenCalledWith({ status: '429' });
  });

  it('records error counters and duration for 500', async () => {
    const end = jest.fn();
    process.env.WHATSAPP_HTTP_RETRIES = '0';
    (http.post as jest.Mock).mockReturnValue(throwError(() => ({ response: { status: 500 } })));
    jest.spyOn(metrics, 'startRequestTimer').mockReturnValue(end);
    await expect(service.sendText('+1', 'ok', 'live')).rejects.toBeTruthy();
    expect(metrics.incrementErrors).toHaveBeenCalledWith('text', 'live', '500');
    expect(end).toHaveBeenCalledWith({ status: '500' });
  });
});
