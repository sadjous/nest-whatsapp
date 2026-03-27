jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: {
    getSingleMetric: jest.fn().mockReturnValue(null),
    metrics: jest.fn().mockResolvedValue('# metrics output'),
  },
  Counter: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnValue({ inc: jest.fn() }),
    inc: jest.fn(),
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    startTimer: jest.fn().mockReturnValue(jest.fn()),
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnValue({ set: jest.fn() }),
    set: jest.fn(),
  })),
}));

import { WhatsAppMetricsService } from './whatsapp.metrics';

describe('WhatsAppMetricsService', () => {
  let service: WhatsAppMetricsService;

  beforeEach(() => {
    service = new WhatsAppMetricsService();
  });

  it('can be instantiated', () => {
    expect(service).toBeDefined();
  });

  it('incrementMessagesSent does not throw', () => {
    expect(() => service.incrementMessagesSent('text', 'live')).not.toThrow();
  });

  it('incrementErrors does not throw', () => {
    expect(() => service.incrementErrors('text', 'live', '500')).not.toThrow();
  });

  it('incrementWebhookEvents does not throw', () => {
    expect(() => service.incrementWebhookEvents()).not.toThrow();
  });

  it('getMetrics returns a string promise', async () => {
    const result = await service.getMetrics();
    expect(typeof result).toBe('string');
  });

  it('startRequestTimer returns a callable end function', () => {
    const end = service.startRequestTimer('text', 'live');
    expect(typeof end).toBe('function');
    expect(() => end({ status: 'success' })).not.toThrow();
  });
});
