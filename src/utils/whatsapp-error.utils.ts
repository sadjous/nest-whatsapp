import {
  WhatsAppAuthException,
  WhatsAppRateLimitException,
} from '../exceptions/whatsapp.exceptions';

type AxiosLike = { response?: { status?: number }; code?: string };

/**
 * Maps a raw Graph API error to a typed, sanitized exception.
 * Strips the HTTP response body to prevent leaking API internals.
 */
export function wrapGraphApiError(e: unknown): never {
  const err = e as AxiosLike;
  const status = err?.response?.status;

  if (status === 401 || status === 403) throw new WhatsAppAuthException();
  if (status === 429) throw new WhatsAppRateLimitException();

  throw new Error(
    typeof status === 'number'
      ? `WhatsApp API error (HTTP ${status})`
      : err?.code
        ? `WhatsApp API network error (${err.code})`
        : 'WhatsApp API error'
  );
}
