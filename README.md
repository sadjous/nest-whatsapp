# nest-whatsapp

[![npm version](https://img.shields.io/npm/v/nest-whatsapp)](https://www.npmjs.com/package/nest-whatsapp)
[![Build Status](https://github.com/SoftZenIT/nest-whatsapp/actions/workflows/ci.yml/badge.svg)](https://github.com/SoftZenIT/nest-whatsapp/actions)
[![Coverage](https://coveralls.io/repos/github/SoftZenIT/nest-whatsapp/badge.svg?branch=master)](https://coveralls.io/github/SoftZenIT/nest-whatsapp?branch=master)
[![API Docs](https://img.shields.io/badge/docs-typedoc-blue)](https://SoftZenIT.github.io/nest-whatsapp/)

NestJS module for the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api).
Supports sandbox & live modes, webhooks, microservice transport, Prometheus metrics, and health checks.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
  - [Getting Started](./docs/guides/getting-started.md) — installation, module setup, minimal example
  - [Configuration](./docs/guides/configuration.md) — all env variables and runtime options
  - [Sending Messages](./docs/guides/sending-messages.md) — all 12 message types with examples
  - [Webhooks & Events](./docs/guides/webhooks.md) — receiving messages, security, event types
  - [Modes: Sandbox vs Live](./docs/guides/modes.md) — sandbox safety, allow-list, switching modes
  - [Advanced](./docs/guides/advanced.md) — metrics, health checks, microservice, management APIs, schematics
- [License](#license)

---

## Features

- **12 message types**: text, image, audio, document, video, sticker, location, template, reaction, interactive, contact card, mark-as-read — all with optional reply threading
- **Media-by-ID**: send previously uploaded media via `{ mediaId }` or fresh media via URL string / `{ url }`
- **Sandbox & Live modes** with enum-typed `WhatsAppMode` — safe, type-checked client selection
- **Webhook controller** auto-registered with HMAC-SHA256 signature verification and payload size limiting
- **Typed events** via `WhatsAppEvents` — subscribe to text, image, audio, video, reactions, referrals (Click-to-WhatsApp) and more
- **Management APIs**: `WhatsAppMediaService`, `WhatsAppTemplatesService`, `WhatsAppPhoneNumbersService`
- **Prometheus metrics** (`nest-whatsapp/metrics`) and **Nest Terminus** health indicator (`nest-whatsapp/health`) — opt-in sub-entries, zero overhead when unused
- **TCP microservice transport** via `forMicroservice`
- **CLI schematic**: `nest generate whatsapp`
- Full TypeScript support (CJS & ESM, strict mode)

---

## Quick Start

```bash
npm install nest-whatsapp
```

```ts
// app.module.ts
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

```ts
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { WhatsAppService, WhatsAppMode } from 'nest-whatsapp';

@Injectable()
export class NotificationService {
  constructor(private readonly wa: WhatsAppService) {}

  async sendWelcome(to: string) {
    // Templates can be sent at any time — no prior conversation required
    await this.wa.sendTemplate(to, 'welcome', [], WhatsAppMode.LIVE);
  }

  async reply(to: string, text: string, originalMessageId: string) {
    // Free-form text requires the user to have messaged you first (24h window)
    await this.wa.sendText(to, text, WhatsAppMode.LIVE, originalMessageId);
  }
}
```

> ⚠️ **24-hour window:** WhatsApp only allows free-form text messages when the user has contacted
> you within the last 24 hours. Use `sendTemplate` to initiate conversations.
> See [Sending Messages](./docs/guides/sending-messages.md#24-hour-messaging-window) for details.

---

## Documentation

| Guide                                                 | Contents                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| [Getting Started](./docs/guides/getting-started.md)   | Installation, `forRoot` / `forRootAsync`, env vars, multi-client setup      |
| [Configuration](./docs/guides/configuration.md)       | All env variables, runtime options, per-client HTTP overrides, Joi schema   |
| [Sending Messages](./docs/guides/sending-messages.md) | All 12 send methods with code examples, 24h window, reply threading         |
| [Webhooks & Events](./docs/guides/webhooks.md)        | Bootstrap setup, `WhatsAppEvents`, all event types, security                |
| [Modes: Sandbox vs Live](./docs/guides/modes.md)      | `WhatsAppMode` enum, testRecipients allow-list, multi-mode                  |
| [Advanced](./docs/guides/advanced.md)                 | Metrics, health, microservice, media/templates/phone management, schematics |

---

## License

Apache-2.0
