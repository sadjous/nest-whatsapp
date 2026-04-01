import { Injectable, Inject, Logger, Optional, OnModuleInit, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import type { AxiosRequestConfig } from 'axios';
import {
  type WhatsAppClientOptions,
  type WhatsAppSandboxOptions,
  type WhatsAppLiveOptions,
  WhatsAppMode,
} from '../interfaces/whatsapp-client-options.interface';
import {
  WHATSAPP_METRICS_SERVICE,
  type IWhatsAppMetrics,
} from '../interfaces/whatsapp-metrics.interface';
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
  WhatsAppMediaSource,
  WhatsAppContactCard,
} from '../interfaces/webhook.interfaces';
import { WhatsAppMessageType } from '../interfaces/webhook.interfaces';
import {
  isLiveConfig,
  isSandboxConfig,
  resolveClientConfig,
  resolveAuthToken,
} from './whatsapp-client.utils';

type AxiosLikeError = {
  response?: { status?: number; headers?: Record<string, unknown> };
  code?: string;
};

type ParsedHttpError = {
  status: number | undefined;
  code: string | undefined;
  isNetwork: boolean;
  is5xx: boolean;
  is429: boolean;
  retryAfterHeader: string | number | undefined;
};

const NETWORK_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ENETUNREACH',
  'EAI_AGAIN',
  'ETIMEDOUT',
]);

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
    @Optional() @Inject(WHATSAPP_METRICS_SERVICE) private readonly metrics?: IWhatsAppMetrics,
    @Optional()
    @Inject(WHATSAPP_RUNTIME_OPTIONS)
    runtimeOptions?: WhatsAppRuntimeOptions
  ) {
    this.sandboxConfig = sandboxConfig;
    this.liveConfig = liveConfig;
    this.runtime = {
      apiVersion: runtimeOptions?.apiVersion ?? 'v25.0',
      httpTimeoutMs: runtimeOptions?.httpTimeoutMs ?? 10000,
      httpRetries: runtimeOptions?.httpRetries ?? 2,
      httpMaxRetryDelayMs: runtimeOptions?.httpMaxRetryDelayMs ?? 5000,
      maskPhoneLogs: runtimeOptions?.maskPhoneLogs ?? true,
      logMessageBodies: runtimeOptions?.logMessageBodies ?? false,
    };
  }

  private getEndpoint(config: WhatsAppClientOptions): string {
    const v = this.runtime.apiVersion;
    return isLiveConfig(config)
      ? `https://graph.facebook.com/${v}/${config.phoneNumberId}/messages`
      : `https://graph.facebook.com/${v}/${config.testPhoneNumberId}/messages`;
  }

  /** Resolves a string URL or typed WhatsAppMediaSource into a Graph API media field. */
  private resolveMediaField(
    source: string | WhatsAppMediaSource
  ): { link: string } | { id: string } {
    if (typeof source === 'string') return { link: source };
    if ('url' in source) return { link: source.url };
    return { id: source.mediaId };
  }

  /** Builds the base URL for phone-number-scoped management endpoints (non-messages). */
  private getPhoneNumberBaseUrl(config: WhatsAppClientOptions): string {
    const v = this.runtime.apiVersion;
    const phoneNumberId = isLiveConfig(config) ? config.phoneNumberId : config.testPhoneNumberId;
    return `https://graph.facebook.com/${v}/${phoneNumberId}`;
  }

  private async postWithRetry(
    url: string,
    payload: WhatsAppOutboundPayload,
    token: string,
    config: WhatsAppClientOptions,
    labels: { type: WhatsAppMessageType; mode: WhatsAppMode }
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
        const delayMs = this.handleRequestError(e, attempt, labels, endTimer);
        attempt++;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  private parseHttpError(e: unknown): ParsedHttpError {
    const err = e as AxiosLikeError;
    const status = err?.response?.status;
    const code = err?.code;
    const retryAfterHeader = err?.response?.headers?.['retry-after'] as string | number | undefined;
    const isNetwork = !!(code && NETWORK_ERROR_CODES.has(code));
    const is5xx = typeof status === 'number' && status >= 500 && status <= 599;
    const is429 = status === 429;
    return { status, code, isNetwork, is5xx, is429, retryAfterHeader };
  }

  private computeRetryDelay(attempt: number, parsed: ParsedHttpError): number {
    if (parsed.is429 && parsed.retryAfterHeader !== undefined) {
      const ra = Number(parsed.retryAfterHeader);
      if (!Number.isNaN(ra) && ra >= 0) return ra * 1000;
    }
    const base = Math.min(this.runtime.httpMaxRetryDelayMs, 200 * 2 ** attempt);
    return Math.floor(Math.random() * base);
  }

  private recordError(
    labels: { type: WhatsAppMessageType; mode: WhatsAppMode },
    endTimer: ((l?: { status?: string }) => void) | undefined,
    status: HttpStatus | string
  ): void {
    this.metrics?.incrementErrors(labels.type, labels.mode, String(status));
    endTimer?.({ status: String(status) });
  }

  private throwMappedError(
    original: unknown,
    parsed: ParsedHttpError,
    labels: { type: WhatsAppMessageType; mode: WhatsAppMode },
    endTimer: ((l?: { status?: string }) => void) | undefined
  ): never {
    if (parsed.is429) {
      this.recordError(labels, endTimer, HttpStatus.TOO_MANY_REQUESTS);
      throw new WhatsAppRateLimitException();
    }
    const errStatus = parsed.status ? String(parsed.status) : (parsed.code ?? 'error');
    this.recordError(labels, endTimer, errStatus);
    if (original instanceof Error) throw original;
    throw Object.assign(
      new Error(parsed.code ?? String(original)),
      original as Record<string, unknown>
    );
  }

  private handleRequestError(
    e: unknown,
    attempt: number,
    labels: { type: WhatsAppMessageType; mode: WhatsAppMode },
    endTimer: ((l?: { status?: string }) => void) | undefined
  ): number {
    const parsed = this.parseHttpError(e);
    if (parsed.status === 401 || parsed.status === 403) {
      this.recordError(labels, endTimer, String(parsed.status));
      throw new WhatsAppAuthException();
    }
    const retryable = parsed.isNetwork || parsed.is5xx || parsed.is429;
    if (!retryable || attempt >= this.runtime.httpRetries) {
      this.throwMappedError(e, parsed, labels, endTimer);
    }
    const delayMs = this.computeRetryDelay(attempt, parsed);
    this.logger.warn(
      `Request failed (status=${parsed.status ?? parsed.code}); retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.runtime.httpRetries})`
    );
    return delayMs;
  }

  async sendText(
    to: string,
    message: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.TEXT,
      text: { body: message },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendText', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.TEXT,
      mode: config.mode,
    });
  }

  async sendMedia(
    to: string,
    mediaUrl: string,
    caption: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendMedia(
    to: string,
    source: WhatsAppMediaSource,
    caption: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendMedia(
    to: string,
    sourceOrUrl: string | WhatsAppMediaSource,
    caption: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.IMAGE,
      image: { ...this.resolveMediaField(sourceOrUrl), caption },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendMedia', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.IMAGE,
      mode: config.mode,
    });
  }

  async sendAudio(
    to: string,
    audioUrl: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendAudio(
    to: string,
    source: WhatsAppMediaSource,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendAudio(
    to: string,
    sourceOrUrl: string | WhatsAppMediaSource,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.AUDIO,
      audio: { ...this.resolveMediaField(sourceOrUrl) },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendAudio', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.AUDIO,
      mode: config.mode,
    });
  }

  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendDocument(
    to: string,
    source: WhatsAppMediaSource,
    filename: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendDocument(
    to: string,
    sourceOrUrl: string | WhatsAppMediaSource,
    filename: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.DOCUMENT,
      document: { ...this.resolveMediaField(sourceOrUrl), filename },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendDocument', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.DOCUMENT,
      mode: config.mode,
    });
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name: string,
    address: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.LOCATION,
      location: { latitude, longitude, name, address },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendLocation', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.LOCATION,
      mode: config.mode,
    });
  }

  async sendTemplate(
    to: string,
    templateName: string,
    variables: string[],
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string,
    languageCode: string = 'en_US'
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.TEMPLATE,
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          { type: 'body', parameters: variables.map((v) => ({ type: 'text', text: v })) },
        ],
      },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendTemplate', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.TEMPLATE,
      mode: config.mode,
    });
  }

  async sendVideo(
    to: string,
    videoUrl: string,
    caption: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendVideo(
    to: string,
    source: WhatsAppMediaSource,
    caption: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendVideo(
    to: string,
    sourceOrUrl: string | WhatsAppMediaSource,
    caption: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.VIDEO,
      video: { ...this.resolveMediaField(sourceOrUrl), caption },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendVideo', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.VIDEO,
      mode: config.mode,
    });
  }

  async sendSticker(
    to: string,
    stickerUrl: string,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendSticker(
    to: string,
    source: WhatsAppMediaSource,
    clientName?: WhatsAppMode,
    replyToMessageId?: string
  ): Promise<string>;
  async sendSticker(
    to: string,
    sourceOrUrl: string | WhatsAppMediaSource,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.STICKER,
      sticker: { ...this.resolveMediaField(sourceOrUrl) },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendSticker', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.STICKER,
      mode: config.mode,
    });
  }

  async sendReaction(
    to: string,
    messageId: string,
    emoji: string,
    clientName: WhatsAppMode = WhatsAppMode.LIVE
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.REACTION,
      reaction: { message_id: messageId, emoji },
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendReaction', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.REACTION,
      mode: config.mode,
    });
  }

  async sendInteractive(
    to: string,
    interactive: WhatsAppOutboundInteractive,
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.INTERACTIVE,
      interactive,
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendInteractive', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.INTERACTIVE,
      mode: config.mode,
    });
  }

  async sendContact(
    to: string,
    contacts: WhatsAppContactCard[],
    clientName: WhatsAppMode = WhatsAppMode.LIVE,
    replyToMessageId?: string
  ): Promise<string> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = this.getEndpoint(config);
    const payload: WhatsAppOutboundPayload = {
      messaging_product: 'whatsapp',
      to,
      type: WhatsAppMessageType.CONTACTS,
      contacts,
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    };
    this.ensureSandboxRecipient(to, config);
    this.logSendOperation('sendContact', to, clientName, payload);
    return this.postWithRetry(url, payload, resolveAuthToken(config), config, {
      type: WhatsAppMessageType.CONTACTS,
      mode: config.mode,
    });
  }

  async markAsRead(messageId: string, clientName: WhatsAppMode = WhatsAppMode.LIVE): Promise<void> {
    const config = resolveClientConfig(clientName, this.sandboxConfig, this.liveConfig);
    const url = `${this.getPhoneNumberBaseUrl(config)}/messages`;
    const token = resolveAuthToken(config);
    const axiosConfig = this.mergeAxiosConfig(config, token);
    const payload = { messaging_product: 'whatsapp', status: 'read', message_id: messageId };
    this.logger.log(`markAsRead messageId=${messageId} client=${clientName}`);
    await lastValueFrom(this.httpService.put<{ success: boolean }>(url, payload, axiosConfig));
  }

  async startSession(to: string, clientName: WhatsAppMode = WhatsAppMode.LIVE): Promise<string> {
    return this.sendText(to, 'Session started', clientName);
  }

  async endSession(to: string, clientName: WhatsAppMode = WhatsAppMode.LIVE): Promise<string> {
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
        ...overrides.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }

  private ensureSandboxRecipient(to: string, config: WhatsAppClientOptions): void {
    if (!isSandboxConfig(config)) {
      return;
    }
    const recipients = config.testRecipients ?? [];
    if (!recipients.length) {
      throw new WhatsAppSandboxRecipientException(
        `Sandbox testRecipients must not be empty when mode=${WhatsAppMode.SANDBOX}. Add at least one recipient number:\n  testRecipients: ['+1234567890']`
      );
    }
    const normalized = this.normalizeRecipient(to);
    const allowed = recipients
      .map((recipient) => this.normalizeRecipient(recipient))
      .includes(normalized);
    if (!allowed) {
      throw new WhatsAppSandboxRecipientException(
        `Recipient ${this.maskRecipient(to)} is not in the sandbox testRecipients allow-list.\nAdd it to your config: testRecipients: ['${to}']\nOr use mode: ${WhatsAppMode.LIVE} for production.`
      );
    }
  }

  private normalizeRecipient(recipient: string): string {
    return recipient.replaceAll(/\D/g, '');
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
    if (this.sandboxConfig) configured.push(WhatsAppMode.SANDBOX);
    if (this.liveConfig) configured.push(WhatsAppMode.LIVE);
    if (configured.length) {
      this.logger.log(`Configured WhatsApp clients: ${configured.join(', ')}`);
    } else {
      this.logger.warn('No WhatsApp clients configured. Provide sandbox or live options.');
    }
  }
}
