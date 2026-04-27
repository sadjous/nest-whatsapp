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
import { resolveClientConfig, resolveAuthToken, graphApiUrl } from './whatsapp-client.utils';
import {
  WHATSAPP_RUNTIME_OPTIONS,
  type WhatsAppRuntimeOptions,
} from '../interfaces/whatsapp-runtime-options.interface';
import {
  WhatsAppAuthException,
  WhatsAppRateLimitException,
} from '../exceptions/whatsapp.exceptions';
import type {
  WhatsAppTemplate,
  WhatsAppTemplateListResponse,
  WhatsAppCreateTemplateDto,
  WhatsAppUpdateTemplateDto,
} from '../interfaces/whatsapp-management.interfaces';

@Injectable()
export class WhatsAppTemplatesService {
  private readonly logger = new Logger(WhatsAppTemplatesService.name);
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

  private buildAxiosConfig(config: WhatsAppClientOptions): AxiosRequestConfig {
    const overrides = config.httpConfig ?? {};
    return {
      timeout: overrides.timeout ?? this.httpTimeoutMs,
      maxRedirects: overrides.maxRedirects ?? 0,
      ...overrides,
      validateStatus: overrides.validateStatus ?? ((s) => s < 400),
      headers: {
        ...(overrides.headers ?? {}),
        Authorization: `Bearer ${resolveAuthToken(config)}`,
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

  /** Retrieve all message templates for a WABA. */
  async listTemplates(
    wabaId: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<WhatsAppTemplate[]> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = graphApiUrl(this.apiVersion, wabaId, 'message_templates');
    this.logger.log(`listTemplates wabaId=${wabaId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.get<WhatsAppTemplateListResponse>(url, this.buildAxiosConfig(config))
      );
      return res.data.data;
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Retrieve a single template by its ID. */
  async getTemplate(
    templateId: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<WhatsAppTemplate> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = graphApiUrl(this.apiVersion, templateId);
    this.logger.log(`getTemplate templateId=${templateId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.get<WhatsAppTemplate>(url, this.buildAxiosConfig(config))
      );
      return res.data;
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Create a new message template. Returns the new template ID. */
  async createTemplate(
    wabaId: string,
    template: WhatsAppCreateTemplateDto,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<{ id: string }> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = graphApiUrl(this.apiVersion, wabaId, 'message_templates');
    this.logger.log(`createTemplate name=${template.name} wabaId=${wabaId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.post<{ id: string }>(url, template, this.buildAxiosConfig(config))
      );
      return res.data;
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Update an existing template's components or category. */
  async updateTemplate(
    templateId: string,
    template: WhatsAppUpdateTemplateDto,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<boolean> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = graphApiUrl(this.apiVersion, templateId);
    this.logger.log(`updateTemplate templateId=${templateId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.post<{ success: boolean }>(url, template, this.buildAxiosConfig(config))
      );
      return res.data?.success ?? true;
    } catch (e) {
      this.mapError(e);
    }
  }

  /** Delete a template by name. */
  async deleteTemplate(
    wabaId: string,
    name: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<boolean> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = graphApiUrl(this.apiVersion, wabaId, 'message_templates');
    this.logger.log(`deleteTemplate name=${name} wabaId=${wabaId} client=${clientName}`);
    try {
      const res = await lastValueFrom(
        this.httpService.delete<{ success: boolean }>(url, {
          ...this.buildAxiosConfig(config),
          params: { name },
        })
      );
      return res.data?.success ?? true;
    } catch (e) {
      this.mapError(e);
    }
  }
}
