import { wrapGraphApiError } from './whatsapp-error.utils';
import {
  WhatsAppAuthException,
  WhatsAppRateLimitException,
} from '../exceptions/whatsapp.exceptions';

describe('wrapGraphApiError', () => {
  it('throws WhatsAppAuthException for 401', () => {
    expect(() => wrapGraphApiError({ response: { status: 401 } })).toThrow(WhatsAppAuthException);
  });

  it('throws WhatsAppAuthException for 403', () => {
    expect(() => wrapGraphApiError({ response: { status: 403 } })).toThrow(WhatsAppAuthException);
  });

  it('throws WhatsAppRateLimitException for 429', () => {
    expect(() => wrapGraphApiError({ response: { status: 429 } })).toThrow(
      WhatsAppRateLimitException
    );
  });

  it('throws a safe error with HTTP status for other status codes', () => {
    expect(() => wrapGraphApiError({ response: { status: 500 } })).toThrow(
      'WhatsApp API error (HTTP 500)'
    );
  });

  it('throws a safe error with error code for network errors', () => {
    expect(() => wrapGraphApiError({ code: 'ECONNRESET' })).toThrow(
      'WhatsApp API network error (ECONNRESET)'
    );
  });

  it('throws a generic safe error for unknown errors', () => {
    expect(() => wrapGraphApiError(new Error('raw api details'))).toThrow('WhatsApp API error');
  });

  it('does not expose response body in thrown error', () => {
    let thrown: unknown;
    try {
      wrapGraphApiError({ response: { status: 500, data: { secret: 'token123' } } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(JSON.stringify(thrown)).not.toContain('token123');
  });
});
