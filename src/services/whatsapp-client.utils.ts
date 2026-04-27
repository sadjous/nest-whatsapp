import {
  type WhatsAppClientOptions,
  WhatsAppMode,
  type WhatsAppSandboxOptions,
  type WhatsAppLiveOptions,
} from '../interfaces/whatsapp-client-options.interface';

export const GRAPH_API_BASE = 'https://graph.facebook.com';

export function graphApiUrl(version: string, ...segments: string[]): string {
  return [GRAPH_API_BASE, version, ...segments].join('/');
}

export function isLiveConfig(cfg: WhatsAppClientOptions): cfg is WhatsAppLiveOptions {
  return cfg.mode === WhatsAppMode.LIVE;
}

export function isSandboxConfig(cfg: WhatsAppClientOptions): cfg is WhatsAppSandboxOptions {
  return cfg.mode === WhatsAppMode.SANDBOX;
}

export function resolveClientConfig(
  clientName: WhatsAppMode,
  sandbox: WhatsAppSandboxOptions | undefined,
  live: WhatsAppLiveOptions | undefined
): WhatsAppClientOptions {
  const cfg = clientName === WhatsAppMode.SANDBOX ? sandbox : live;
  if (!cfg) throw new Error(`WhatsApp client config '${clientName}' not provided`);
  return cfg;
}

export function resolveAuthToken(config: WhatsAppClientOptions): string {
  return isLiveConfig(config) ? config.accessToken : config.temporaryAccessToken;
}
