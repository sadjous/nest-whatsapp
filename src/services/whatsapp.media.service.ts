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
  WhatsAppMediaUploadResponse,
  WhatsAppMediaUrlResponse,
} from '../interfaces/whatsapp-management.interfaces';

@Injectable()
export class WhatsAppMediaService {
  private readonly logger = new Logger(WhatsAppMediaService.name);
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

  private getPhoneNumberId(config: WhatsAppClientOptions): string {
    return config.mode === WhatsAppMode.LIVE
      ? (config as WhatsAppLiveOptions).phoneNumberId
      : (config as WhatsAppSandboxOptions).testPhoneNumberId;
  }

  private buildAxiosConfig(
    config: WhatsAppClientOptions,
    extraHeaders?: Record<string, string>
  ): AxiosRequestConfig {
    const overrides = config.httpConfig ?? {};
    return {
      timeout: overrides.timeout ?? this.httpTimeoutMs,
      maxRedirects: overrides.maxRedirects ?? 0,
      ...overrides,
      validateStatus: overrides.validateStatus ?? ((s) => s < 400),
      headers: {
        ...(overrides.headers ?? {}),
        Authorization: `Bearer ${this.getAuthToken(config)}`,
        ...extraHeaders,
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

  /**
   * Upload a media file to WhatsApp and receive a reusable media ID.
   * @param file     - Raw file buffer
   * @param mimeType - MIME type (e.g. 'image/jpeg', 'audio/ogg', 'application/pdf')
   * @param filename - Optional filename for the upload
   */
  async uploadMedia(
    file: Buffer,
    mimeType: string,
    filename: string = 'upload',
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<WhatsAppMediaUploadResponse> {
    const config = this.getConfig(clientName);
    const phoneNumberId = this.getPhoneNumberId(config);
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/media`;
    this.logger.log(`uploadMedia mimeType=${mimeType} client=${clientName}`);

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);
    formData.append(
      'file',
      new Blob(
        [(file.buffer as ArrayBuffer).slice(file.byteOffset, file.byteOffset + file.byteLength)],
        { type: mimeType }
      ),
      filename
    );

    try {
      const res = await lastValueFrom(
        this.httpService.post<WhatsAppMediaUploadResponse>(
          url,
          formData,
          this.buildAxiosConfig(config)
        )
      );
      return res.data;
    } catch (e) {
      this.mapError(e);
    }
  }

  /**
   * Retrieve the download URL and metadata for an uploaded media asset.
   * The returned URL is short-lived (expires in ~5 minutes).
   */
  async getMediaUrl(
    mediaId: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<WhatsAppMediaUrlResponse> {
    const config = this.getConfig(clientName);
    const phoneNumberId = this.getPhoneNumberId(config);
    const url = `https://graph.facebook.com/${this.apiVersion}/${mediaId}`;
    this.logger.log(`getMediaUrl mediaId=${mediaId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.get<Record<string, unknown>>(url, {
          ...this.buildAxiosConfig(config),
          params: { phone_number_id: phoneNumberId },
        })
      );
      const d = res.data;
      return {
        id: d['id'] as string,
        url: d['url'] as string,
        mimeType: d['mime_type'] as string,
        sha256: d['sha256'] as string,
        fileSize: d['file_size'] as number,
        messagingProduct: d['messaging_product'] as 'whatsapp',
      };
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Delete a previously uploaded media asset by its ID. */
  async deleteMedia(
    mediaId: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<boolean> {
    const config = this.getConfig(clientName);
    const phoneNumberId = this.getPhoneNumberId(config);
    const url = `https://graph.facebook.com/${this.apiVersion}/${mediaId}`;
    this.logger.log(`deleteMedia mediaId=${mediaId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.delete<{ deleted: boolean }>(url, {
          ...this.buildAxiosConfig(config),
          params: { phone_number_id: phoneNumberId },
        })
      );
      return res.data?.deleted ?? true;
    } catch (e) {
      this.mapError(e);
    }
  }
}
