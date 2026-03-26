# Getting Started

[← Back to README](../../README.md)

## Table of Contents

- [Installation](#installation)
- [Module Setup](#module-setup)
- [Environment Variables](#environment-variables)
- [Minimal Working Example](#minimal-working-example)

---

## Installation

```bash
npm install nest-whatsapp
```

Optional peer dependencies (install only what you need):

```bash
npm install @nestjs/terminus           # health indicator
npm install @nestjs/microservices      # TCP microservice transport
npm install @nestjs/event-emitter      # wildcard event listeners
```

---

## Module Setup

### Synchronous (`forRoot`)

```ts
import { WhatsAppModule, WhatsAppMode } from 'nest-whatsapp';

@Module({
  imports: [
    WhatsAppModule.forRoot({
      mode: WhatsAppMode.SANDBOX,
      testPhoneNumberId: '123456789',
      temporaryAccessToken: 'EAAxxxxxxx',
      testRecipients: ['+15551234567'],
    }),
  ],
})
export class AppModule {}
```

### Async / DI Factory (`forRootAsync`) — recommended for production

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsAppModule, WhatsAppMode } from 'nest-whatsapp';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WhatsAppModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const mode = cs.get('WHATSAPP_MODE');
        if (mode === 'sandbox') {
          return {
            mode: WhatsAppMode.SANDBOX,
            testPhoneNumberId: cs.getOrThrow('WHATSAPP_SANDBOX_PHONE_NUMBER_ID'),
            temporaryAccessToken: cs.getOrThrow('WHATSAPP_SANDBOX_ACCESS_TOKEN'),
            testRecipients: cs.get<string>('WHATSAPP_SANDBOX_TEST_RECIPIENTS')?.split(',') ?? [],
          };
        }
        return {
          mode: WhatsAppMode.LIVE,
          businessAccountId: cs.getOrThrow('WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID'),
          phoneNumberId: cs.getOrThrow('WHATSAPP_LIVE_PHONE_NUMBER_ID'),
          accessToken: cs.getOrThrow('WHATSAPP_LIVE_ACCESS_TOKEN'),
        };
      },
    }),
  ],
})
export class AppModule {}
```

### Multi-client (sandbox + live simultaneously)

```ts
WhatsAppModule.forRoot([
  {
    mode: WhatsAppMode.SANDBOX,
    testPhoneNumberId: '...',
    temporaryAccessToken: '...',
    testRecipients: ['+15551234567'],
  },
  {
    mode: WhatsAppMode.LIVE,
    businessAccountId: '...',
    phoneNumberId: '...',
    accessToken: '...',
  },
]);
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values for your chosen mode.

```env
# Required
WHATSAPP_MODE=sandbox               # "sandbox" or "live"
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...   # any secret string
WHATSAPP_APP_SECRET=...             # from Meta app dashboard

# Sandbox credentials
WHATSAPP_SANDBOX_PHONE_NUMBER_ID=...
WHATSAPP_SANDBOX_ACCESS_TOKEN=...
WHATSAPP_SANDBOX_TEST_RECIPIENTS=+15551234567,+15559876543

# Live credentials
WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID=...
WHATSAPP_LIVE_PHONE_NUMBER_ID=...
WHATSAPP_LIVE_ACCESS_TOKEN=...
```

See [Configuration](./configuration.md) for all options.

---

## Minimal Working Example

```ts
import { Injectable } from '@nestjs/common';
import { WhatsAppService, WhatsAppMode } from 'nest-whatsapp';

@Injectable()
export class NotificationService {
  constructor(private readonly wa: WhatsAppService) {}

  async notify(to: string, message: string) {
    const messageId = await this.wa.sendText(to, message, WhatsAppMode.LIVE);
    console.log('Sent:', messageId);
  }
}
```

> **Next:** [Sending Messages →](./sending-messages.md)
