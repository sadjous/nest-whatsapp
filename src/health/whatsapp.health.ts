import { Injectable, Inject, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  WhatsAppSandboxOptions,
  WhatsAppLiveOptions,
} from '../interfaces/whatsapp-client-options.interface';
import {
  WHATSAPP_RUNTIME_OPTIONS,
  type WhatsAppRuntimeOptions,
} from '../interfaces/whatsapp-runtime-options.interface';

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

  constructor(
    private readonly httpService: HttpService,
    private readonly moduleRef: ModuleRef,
    @Optional()
    @Inject(WHATSAPP_RUNTIME_OPTIONS)
    private readonly runtimeOptions?: WhatsAppRuntimeOptions
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const sandboxConfig = this.resolveToken<WhatsAppSandboxOptions>('WHATSAPP_CLIENT_SANDBOX');
    const liveConfig = this.resolveToken<WhatsAppLiveOptions>('WHATSAPP_CLIENT_LIVE');
    const configReady = this.hasConfig(sandboxConfig, liveConfig);
    if (!configReady.ready) {
      const result = this.makeStatus(key, false, { message: configReady.reason });
      throw createHealthCheckError('WhatsApp config missing', result);
    }
    if (this.skipExternalCheck) {
      return this.makeStatus(key, true, {
        message: 'External check disabled via WHATSAPP_HEALTH_SKIP_EXTERNAL',
      });
    }
    const version = this.runtimeOptions?.apiVersion ?? 'v25.0';
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

  private resolveToken<T>(token: string): T | undefined {
    try {
      return this.moduleRef.get<T>(token, { strict: false });
    } catch {
      return undefined;
    }
  }

  private hasConfig(
    sandboxConfig?: WhatsAppSandboxOptions,
    liveConfig?: WhatsAppLiveOptions
  ): { ready: boolean; reason?: string } {
    if (!sandboxConfig && !liveConfig) {
      return { ready: false, reason: 'No WhatsApp client configured' };
    }
    if (sandboxConfig) {
      if (
        !sandboxConfig.testPhoneNumberId ||
        !sandboxConfig.temporaryAccessToken ||
        !sandboxConfig.testRecipients?.length
      ) {
        return { ready: false, reason: 'Sandbox credentials incomplete' };
      }
    }
    if (liveConfig) {
      if (!liveConfig.phoneNumberId || !liveConfig.accessToken) {
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
