import type { AxiosRequestConfig } from 'axios';

export type WhatsAppMode = 'sandbox' | 'live';
export interface WhatsAppSandboxOptions {
  mode: 'sandbox';
  testPhoneNumberId: string;
  temporaryAccessToken: string;
  testRecipients: string[];
  httpConfig?: AxiosRequestConfig;
}
export interface WhatsAppLiveOptions {
  mode: 'live';
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  httpConfig?: AxiosRequestConfig;
}
export type WhatsAppClientOptions = WhatsAppSandboxOptions | WhatsAppLiveOptions;
