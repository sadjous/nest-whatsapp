import { Injectable, Inject, Logger, Optional, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import type { AxiosRequestConfig } from 'axios';
import {
  WhatsAppClientOptions,
  WhatsAppSandboxOptions,
  WhatsAppLiveOptions,
  WhatsAppMode,
} from '../interfaces/whatsapp-client-options.interface';
import { WhatsAppMetricsService } from './whatsapp.metrics';
import {
  WhatsAppAuthException,
  WhatsAppRateLimitException,
  WhatsAppSandboxRecipientException,
} from '../exceptions/whatsapp.exceptions';
import {
  WHATSAPP_RUNTIME_OPTIONS,
  type WhatsAppRuntimeOptions,
} from '../interfaces/whatsapp-runtime-options.interface';
import type {
  WhatsAppOutboundPayload,
  WhatsAppOutboundInteractive,
} from '../interfaces/webhook.interfaces';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly sandboxConfig: WhatsAppSandboxOptions | undefined;
  private readonly liveConfig: WhatsAppLiveOptions | undefined;
  private readonly runtime: {
    apiVersion: string;
    httpTimeoutMs: number;
    httpRetries: number;
    httpMaxRetryDelayMs: number;
    maskPhoneLogs: boolean;
    logMessageBodies: boolean;
  };

  constructor(
    private readonly httpService: HttpService,
    @Optional() @Inject('WHATSAPP_CLIENT_SANDBOX') sandboxConfig?: WhatsAppSandboxOptions,
    @Optional() @Inject('WHATSAPP_CLIENT_LIVE') liveConfig?: WhatsAppLiveOptions,
    @Optional() private readonly metrics?: WhatsAppMetricsService,
    @Optional()
    @Inject(WHATSAPP_RUNTIME_OPTIONS)
    runtimeOptions?: WhatsAppRuntimeOptions
  ) {
    this.sandboxConfig = sandboxConfig;
    this.liveConfig = liveConfig;
    this.runtime = {
      apiVersion: runtimeOptions?.apiVersion ?? 'v17.0',
      httpTimeoutMs: runtimeOptions?.httpTimeoutMs ?? 10000,
      httpRetries: runtimeOptions?.httpRetries ?? 2,
      httpMaxRetryDelayMs: runtimeOptions?.httpMaxRetryDelayMs ?? 5000,
      maskPhoneLogs: runtimeOptions?.maskPhoneLogs ?? true,
      logMessageBodies: runtimeOptions?.logMessageBodies ?? false,
    };
  }

  private isLiveConfig(cfg: WhatsAppClientOptions): cfg is WhatsAppLiveOptions {
    return cfg.mode === 'live';
  }

  private isSandboxConfig(cfg: WhatsAppClientOptions): cfg is WhatsAppSandboxOptions {
    return cfg.mode === 'sandbox';
  }

  private getConfig(clientName: WhatsAppMode): WhatsAppClientOptions {
    const cfg = clientName === 'sandbox' ? this.sandboxConfig : this.liveConfig;
    if (!cfg) {
      throw new Error(`WhatsApp client config '${clientName}' not provided`);
    }
    return cfg;
  }

  private getEndpoint(config: WhatsAppClientOptions): string {
    const v = this.runtime.apiVersion;
    return this.isLiveConfig(config)
      ? `https://graph.facebook.com/${v}/${config.phoneNumberId}/messages`
      : `https://graph.facebook.com/${v}/${(config as WhatsAppSandboxOptions).testPhoneNumberId}/messages`;
  }

  private getAuthToken(config: WhatsAppClientOptions): string {
    return this.isLiveConfig(config) ? config.accessToken : config.temporaryAccessToken;
  }

  private async postWithRetry(
    url: string,
    payload: WhatsAppOutboundPayload,
    token: string,
    config: WhatsAppClientOptions,
    labels: { type: string; mode: WhatsAppMode }
  ): Promise<string> {
    let attempt = 0;
    const endTimer = this.metrics?.startRequestTimer(labels.type, labels.mode);
    const axiosConfig = this.mergeAxiosConfig(config, token);

    while (true) {
      try {
        const res = await lastValueFrom(
          this.httpService.post<{ messages: Array<{ id: string }> }>(url, payload, axiosConfig)
        );
        this.metrics?.incrementMessagesSent(labels.type, labels.mode);
        endTimer?.({ status: 'success' });
        return res.data?.messages?.[0]?.id ?? '';
      } catch (e: unknown) {
        type AxiosLikeError = {
          response?: { status?: number; headers?: Record<string, unknown> };
          code?: string;
        };
        const err = e as AxiosLikeError;
        const status: number | undefined = err?.response?.status;
        const retryAfterHeader = err?.response?.headers?.['retry-after'] as
          | string
          | number
          | undefined;
        // Immediate mapping, no retry for auth errors
        if (status === 401 || status === 403) {
          this.metrics?.incrementErrors(labels.type, labels.mode, String(status));
          endTimer?.({ status: String(status) });
          throw new WhatsAppAuthException();
        }
        const isNetwork = !!(
          err?.code &&
          ['ECONNABORTED', 'ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN', 'ETIMEDOUT'].includes(err.code)
        );
        const is5xx = typeof status === 'number' && status >= 500 && status <= 599;
        const is429 = status === 429;
        const retryable = isNetwork || is5xx || is429;
        if (!retryable || attempt >= this.runtime.httpRetries) {
          if (status === 429) {
            this.metrics?.incrementErrors(labels.type, labels.mode, '429');
            endTimer?.({ status: '429' });
            throw new WhatsAppRateLimitException();
          }
          const errStatus = status ? String(status) : (err?.code ?? 'error');
          this.metrics?.incrementErrors(labels.type, labels.mode, errStatus);
          endTimer?.({ status: errStatus });
          throw e;
        }
        attempt++;
        // Compute delay with optional Retry-After and exponential backoff + jitter
        let delayMs = 0;
        if (is429 && retryAfterHeader !== undefined) {
          const ra = Number(retryAfterHeader);
          if (!Number.isNaN(ra) && ra >= 0) delayMs = ra * 1000;
        }
        if (delayMs === 0) {
          const base = Math.min(this.runtime.httpMaxRetryDelayMs, 200 * 2 ** (attempt - 1));
          delayMs = Math.floor(Math.random() * base);
        }
        this.logger.warn(
          `Request failed (status=${status ?? err?.code}); retrying in ${delayMs}ms (attempt ${attempt}/${this.runtime.httpRetries})`
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  async sendText(
    to: string,
    message: string,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendText', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'text',
      mode: config.mode,
    });
  }

  async sendMedia(
    to: string,
    mediaUrl: string,
    caption: string,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: mediaUrl, caption },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendMedia', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'image',
      mode: config.mode,
    });
  }

  async sendAudio(
    to: string,
    audioUrl: string,
    caption: string,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'audio',
      audio: { link: audioUrl, caption },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendAudio', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'audio',
      mode: config.mode,
    });
  }

  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { link: documentUrl, filename },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendDocument', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'document',
      mode: config.mode,
    });
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name: string,
    address: string,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'location',
      location: { latitude, longitude, name, address },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendLocation', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'location',
      mode: config.mode,
    });
  }

  async sendTemplate(
    to: string,
    templateName: string,
    variables: string[],
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [
          { type: 'body', parameters: variables.map((v) => ({ type: 'text', text: v })) },
        ],
      },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendTemplate', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'template',
      mode: config.mode,
    });
  }

  async sendVideo(
    to: string,
    videoUrl: string,
    caption: string,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      video: { link: videoUrl, caption },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendVideo', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'video',
      mode: config.mode,
    });
  }

  async sendSticker(
    to: string,
    stickerUrl: string,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'sticker',
      sticker: { link: stickerUrl },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendSticker', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'sticker',
      mode: config.mode,
    });
  }

  async sendReaction(
    to: string,
    messageId: string,
    emoji: string,
    clientName: WhatsAppMode = 'live'
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendReaction', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'reaction',
      mode: config.mode,
    });
  }

  async sendInteractive(
    to: string,
    interactive: WhatsAppOutboundInteractive,
    clientName: WhatsAppMode = 'live',
    replyToMessageId?: string
  ): Promise<string> {
    const config = this.getConfig(clientName);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendInteractive', to, clientName, payload);
    return this.postWithRetry(url, payload, this.getAuthToken(config), config, {
      type: 'interactive',
      mode: config.mode,
    });
  }

  async startSession(to: string, clientName: WhatsAppMode = 'live'): Promise<string> {
    return this.sendText(to, 'Session started', clientName);
  }

  async endSession(to: string, clientName: WhatsAppMode = 'live'): Promise<string> {
    return this.sendText(to, 'Session ended', clientName);
  }

  private mergeAxiosConfig(config: WhatsAppClientOptions, token: string): AxiosRequestConfig {
    const overrides = config.httpConfig ?? {};
    const validateStatus =
      overrides.validateStatus ?? ((status: number) => typeof status === 'number' && status < 400);
    return {
      timeout: overrides.timeout ?? this.runtime.httpTimeoutMs,
      maxRedirects: overrides.maxRedirects ?? 0,
      ...overrides,
      validateStatus,
      headers: {
        ...(overrides.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    };
  }

  private ensureSandboxRecipient(to: string, config: WhatsAppClientOptions): void {
    if (!this.isSandboxConfig(config)) {
      return;
    }
    const recipients = config.testRecipients ?? [];
    if (!recipients.length) {
      throw new WhatsAppSandboxRecipientException(
        'Sandbox testRecipients must be configured when mode=sandbox'
      );
    }
    const normalized = this.normalizeRecipient(to);
    const allowed = recipients
      .map((recipient) => this.normalizeRecipient(recipient))
      .includes(normalized);
    if (!allowed) {
      throw new WhatsAppSandboxRecipientException(
        `Recipient ${this.maskRecipient(to)} is not in sandbox testRecipients allow-list`
      );
    }
  }

  private normalizeRecipient(recipient: string): string {
    return recipient.replace(/[^0-9]/g, '');
  }

  private maskRecipient(recipient: string): string {
    if (!this.runtime.maskPhoneLogs) {
      return recipient;
    }
    const digits = this.normalizeRecipient(recipient);
    if (!digits) {
      return recipient;
    }
    if (digits.length <= 4) {
      return `${recipient.slice(0, 1)}****`;
    }
    const start = recipient.startsWith('+') ? '+' : '';
    const head = digits.slice(0, Math.min(4, digits.length - 2));
    const tail = digits.slice(-4);
    return `${start}${head}****${tail}`;
  }

  private logSendOperation(
    operation: string,
    to: string,
    clientName: WhatsAppMode,
    payload: unknown
  ): void {
    this.logger.log(`${operation} to=${this.maskRecipient(to)} client=${clientName}`);
    if (this.runtime.logMessageBodies) {
      this.logger.debug(`${operation} payload=${JSON.stringify(payload)}`);
    }
  }

  onModuleInit(): void {
    const configured: string[] = [];
    if (this.sandboxConfig) configured.push('sandbox');
    if (this.liveConfig) configured.push('live');
    if (configured.length) {
      this.logger.log(`Configured WhatsApp clients: ${configured.join(', ')}`);
    } else {
      this.logger.warn('No WhatsApp clients configured. Provide sandbox or live options.');
    }
  }
}
