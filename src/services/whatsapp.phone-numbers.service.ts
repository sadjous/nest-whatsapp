import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import type { AxiosRequestConfig } from 'axios';
import {
  type WhatsAppClientOptions,
  WhatsAppMode,
  type WhatsAppSandboxOptions,
  type WhatsAppLiveOptions,
} from '../interfaces/whatsapp-client-options.interface';
import {
  WHATSAPP_RUNTIME_OPTIONS,
  type WhatsAppRuntimeOptions,
} from '../interfaces/whatsapp-runtime-options.interface';
import {
  WhatsAppAuthException,
  WhatsAppRateLimitException,
} from '../exceptions/whatsapp.exceptions';
import type {
  WhatsAppPhoneNumber,
  WhatsAppPhoneNumberListResponse,
} from '../interfaces/whatsapp-management.interfaces';

@Injectable()
export class WhatsAppPhoneNumbersService {
  private readonly logger = new Logger(WhatsAppPhoneNumbersService.name);
  private readonly sandboxConfig: WhatsAppSandboxOptions | undefined;
  private readonly liveConfig: WhatsAppLiveOptions | undefined;
  private readonly apiVersion: string;
  private readonly httpTimeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    @Optional() @Inject('WHATSAPP_CLIENT_SANDBOX') sandboxConfig?: WhatsAppSandboxOptions,
    @Optional() @Inject('WHATSAPP_CLIENT_LIVE') liveConfig?: WhatsAppLiveOptions,
    @Optional()
    @Inject(WHATSAPP_RUNTIME_OPTIONS)
    runtimeOptions?: WhatsAppRuntimeOptions
  ) {
    this.sandboxConfig = sandboxConfig;
    this.liveConfig = liveConfig;
    this.apiVersion = runtimeOptions?.apiVersion ?? 'v25.0';
    this.httpTimeoutMs = runtimeOptions?.httpTimeoutMs ?? 10000;
  }

  private getConfig(clientName: WhatsAppMode): WhatsAppClientOptions {
    const cfg = clientName === WhatsAppMode.SANDBOX ? this.sandboxConfig : this.liveConfig;
    if (!cfg) throw new Error(`WhatsApp client config '${clientName}' not provided`);
    return cfg;
  }

  private getAuthToken(config: WhatsAppClientOptions): string {
    return config.mode === WhatsAppMode.LIVE
      ? (config as WhatsAppLiveOptions).accessToken
      : (config as WhatsAppSandboxOptions).temporaryAccessToken;
  }

  private buildAxiosConfig(config: WhatsAppClientOptions): AxiosRequestConfig {
    const overrides = config.httpConfig ?? {};
    return {
      timeout: overrides.timeout ?? this.httpTimeoutMs,
      maxRedirects: overrides.maxRedirects ?? 0,
      ...overrides,
      validateStatus: overrides.validateStatus ?? ((s) => s < 400),
      headers: {
        ...(overrides.headers ?? {}),
        Authorization: `Bearer ${this.getAuthToken(config)}`,
      },
    };
  }

  private mapError(e: unknown): never {
    type AxiosLike = { response?: { status?: number } };
    const status = (e as AxiosLike)?.response?.status;
    if (status === 401 || status === 403) throw new WhatsAppAuthException();
    if (status === 429) throw new WhatsAppRateLimitException();
    throw e;
  }

  /** Normalise the raw Graph API response keys to camelCase. */
  private normalizePhoneNumber(raw: Record<string, unknown>): WhatsAppPhoneNumber {
    return {
      id: raw['id'] as string,
      displayPhoneNumber: raw['display_phone_number'] as string,
      verifiedName: raw['verified_name'] as string,
      nameStatus: raw['name_status'] as WhatsAppPhoneNumber['nameStatus'],
      qualityRating: raw['quality_rating'] as WhatsAppPhoneNumber['qualityRating'],
      accountMode: raw['account_mode'] as WhatsAppPhoneNumber['accountMode'],
      isOfficialBusinessAccount: raw['is_official_business_account'] as boolean | undefined,
    };
  }

  /** List all phone numbers registered under a WABA. */
  async listPhoneNumbers(
    wabaId: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<WhatsAppPhoneNumber[]> {
    const config = this.getConfig(clientName);
    const url = `https://graph.facebook.com/${this.apiVersion}/${wabaId}/phone_numbers`;
    this.logger.log(`listPhoneNumbers wabaId=${wabaId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.get<WhatsAppPhoneNumberListResponse>(url, this.buildAxiosConfig(config))
      );
      return (res.data.data as unknown as Record<string, unknown>[]).map((r) =>
        this.normalizePhoneNumber(r)
      );
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Get details of a specific phone number by its ID. */
  async getPhoneNumber(
    phoneNumberId: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<WhatsAppPhoneNumber> {
    const config = this.getConfig(clientName);
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}`;
    this.logger.log(`getPhoneNumber phoneNumberId=${phoneNumberId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.get<Record<string, unknown>>(url, this.buildAxiosConfig(config))
      );
      return this.normalizePhoneNumber(res.data);
    } catch (e) {
      this.mapError(e);
    }
  }

  /**
   * Request a verification code to be sent to the phone number via SMS or voice call.
   * @param codeMethod - Delivery method: 'SMS' or 'VOICE'
   * @param locale     - BCP 47 language code (e.g. 'en_US'). Defaults to 'en_US'.
   */
  async requestVerificationCode(
    phoneNumberId: string,
    codeMethod: 'SMS' | 'VOICE',
    locale: string = 'en_US',
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<boolean> {
    const config = this.getConfig(clientName);
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/request_code`;
    this.logger.log(
      `requestVerificationCode phoneNumberId=${phoneNumberId} method=${codeMethod} client=${clientName}`
    );
    try {
      const res = await lastValueFrom(
        this.httpService.post<{ success: boolean }>(
          url,
          { code_method: codeMethod, language: locale },
          this.buildAxiosConfig(config)
        )
      );
      return res.data?.success ?? true;
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Verify the code received via SMS or voice to confirm phone number ownership. */
  async verifyCode(
    phoneNumberId: string,
    code: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<boolean> {
    const config = this.getConfig(clientName);
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/verify_code`;
    this.logger.log(`verifyCode phoneNumberId=${phoneNumberId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.post<{ success: boolean }>(url, { code }, this.buildAxiosConfig(config))
      );
      return res.data?.success ?? true;
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Set or update the two-step verification PIN for a phone number. */
  async setTwoStepPin(
    phoneNumberId: string,
    pin: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<boolean> {
    const config = this.getConfig(clientName);
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}`;
    this.logger.log(`setTwoStepPin phoneNumberId=${phoneNumberId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.post<{ success: boolean }>(url, { pin }, this.buildAxiosConfig(config))
      );
      return res.data?.success ?? true;
    } catch (e) {
      this.mapError(e);
    }
  }
}
