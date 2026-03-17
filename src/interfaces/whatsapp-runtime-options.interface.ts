export interface WhatsAppRuntimeOptions {
  apiVersion?: string;
  httpTimeoutMs?: number;
  httpRetries?: number;
  httpMaxRetryDelayMs?: number;
  maskPhoneLogs?: boolean;
  logMessageBodies?: boolean;
}

export const WHATSAPP_RUNTIME_OPTIONS = Symbol('WHATSAPP_RUNTIME_OPTIONS');
