import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface HealthIndicatorResult {
  [key: string]: {
    status: 'up' | 'down';
    [key: string]: unknown;
  };
}

@Injectable()
export class WhatsAppHealthIndicator {
  private readonly timeoutMs = Number(process.env.WHATSAPP_HEALTH_TIMEOUT_MS ?? '3000');
  private readonly skipExternalCheck = process.env.WHATSAPP_HEALTH_SKIP_EXTERNAL === 'true';

  constructor(private readonly httpService: HttpService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const configReady = this.hasConfig();
    if (!configReady.ready) {
      const result = this.makeStatus(key, false, { message: configReady.reason });
      throw createHealthCheckError('WhatsApp config missing', result);
    }
    if (this.skipExternalCheck) {
      return this.makeStatus(key, true, {
        message: 'External check disabled via WHATSAPP_HEALTH_SKIP_EXTERNAL',
      });
    }
    const version = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v17.0';
    const url = `https://graph.facebook.com/${version}`;
    try {
      await firstValueFrom(
        this.httpService.get(url, {
          params: { fields: 'id' },
          timeout: this.timeoutMs,
        })
      );
      return this.makeStatus(key, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const result = this.makeStatus(key, false, { message });
      throw createHealthCheckError('WhatsApp API health check failed', result);
    }
  }

  private hasConfig(): { ready: boolean; reason?: string } {
    const mode = process.env.WHATSAPP_MODE;
    if (!mode) {
      return { ready: false, reason: 'WHATSAPP_MODE not set' };
    }
    if (mode === 'sandbox') {
      if (
        !process.env.WHATSAPP_SANDBOX_PHONE_NUMBER_ID ||
        !process.env.WHATSAPP_SANDBOX_ACCESS_TOKEN ||
        !process.env.WHATSAPP_SANDBOX_TEST_RECIPIENTS
      ) {
        return {
          ready: false,
          reason: 'Sandbox credentials incomplete',
        };
      }
    }
    if (mode === 'live') {
      if (!process.env.WHATSAPP_LIVE_PHONE_NUMBER_ID || !process.env.WHATSAPP_LIVE_ACCESS_TOKEN) {
        return { ready: false, reason: 'Live credentials incomplete' };
      }
    }
    return { ready: true };
  }

  private makeStatus(
    key: string,
    healthy: boolean,
    data?: Record<string, unknown>
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: healthy ? 'up' : 'down',
        ...(data ?? {}),
      },
    };
  }
}

function createHealthCheckError(message: string, result: HealthIndicatorResult): Error {
  try {
    const { HealthCheckError } = require('@nestjs/terminus');
    return new HealthCheckError(message, result);
  } catch {
    const error = new Error(message);
    (error as Error & { result?: HealthIndicatorResult }).result = result;
    return error;
  }
}
