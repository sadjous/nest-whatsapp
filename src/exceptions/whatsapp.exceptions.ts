import { HttpException, HttpStatus } from '@nestjs/common';

export class WhatsAppAuthException extends HttpException {
  constructor() {
    super('WhatsApp authentication failed', HttpStatus.UNAUTHORIZED);
  }
}

export class WhatsAppRateLimitException extends HttpException {
  constructor() {
    super('WhatsApp rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class WhatsAppSandboxRecipientException extends HttpException {
  constructor(message = 'Recipient not allowed in WhatsApp sandbox mode') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
