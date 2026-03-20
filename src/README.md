# nest-whatsapp

[![npm version](https://img.shields.io/npm/v/nest-whatsapp)](https://www.npmjs.com/package/nest-whatsapp)
[![Build Status](https://github.com/softzenit/nest-whatsapp/actions/workflows/ci.yml/badge.svg)](https://github.com/softzenit/nest-whatsapp/actions)
[![Coverage Status](https://coveralls.io/repos/github/SoftZenIT/nest-whatsapp/badge.svg?branch=main)](https://coveralls.io/github/SoftZenIT/nest-whatsapp?branch=main)

NestJS module for seamless integration with the WhatsApp Cloud API, supporting sandbox & live modes, multi-clients, webhooks, microservice transport, metrics, and health checks.

## Features

- Send text, image, audio, document, location, and template messages
- Session management helpers (`startSession`, `endSession`)
- Sandbox mode for rapid testing
- Live mode for production with template enforcement and rate limits
- Webhook verification & event emitting
- Nest microservice transport (TCP)
- Prometheus metrics and Nest Terminus health indicator
- Full TypeScript support (CJS & ESM)
- Easy configuration via\*\* **`forRoot` /** \*\*`forRootAsync`
- CLI schematic:\*\* \*\*`nest generate whatsapp`

## Quickstart

```bash
npm install nest-whatsapp
```

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import whatsappConfig, { WhatsappConfigSchema } from './config/whatsapp.config';
import { WhatsAppModule } from 'nest-whatsapp';
import { WhatsAppController } from './controllers/whatsapp.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [whatsappConfig],
      validationSchema: WhatsappConfigSchema,
    }),
    WhatsAppModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const cfg = cs.get('whatsapp');
        return cfg.mode === 'sandbox'
          ? {
              mode: 'sandbox',
              testPhoneNumberId: cfg.sandbox.testPhoneNumberId,
              temporaryAccessToken: cfg.sandbox.temporaryAccessToken,
              testRecipients: cfg.sandbox.testRecipients,
            }
          : {
              mode: 'live',
              businessAccountId: cfg.live.businessAccountId,
              phoneNumberId: cfg.live.phoneNumberId,
              accessToken: cfg.live.accessToken,
            };
      },
    }),
  ],
  controllers: [WhatsAppController],
})
export class AppModule {}
```

## Configuration

Use environment variables or secret manager via\*\* \*\*`forRootAsync`:

| Variable                            | Description                            | Required     |
| ----------------------------------- | -------------------------------------- | ------------ |
| `WHATSAPP_MODE`                     | `sandbox` or `live`                    | yes          |
| `WHATSAPP_SANDBOX_PHONE_NUMBER_ID`  | Sandbox phone number ID                | if `sandbox` |
| `WHATSAPP_SANDBOX_ACCESS_TOKEN`     | Sandbox temporary access token         | if `sandbox` |
| `WHATSAPP_SANDBOX_TEST_RECIPIENTS`  | Comma-separated test recipient numbers | if `sandbox` |
| `WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID` | Live business account ID               | if `live`    |
| `WHATSAPP_LIVE_PHONE_NUMBER_ID`     | Live phone number ID                   | if `live`    |
| `WHATSAPP_LIVE_ACCESS_TOKEN`        | Live long-lived access token           | if `live`    |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`     | Webhook verification token             | yes          |
| `WHATSAPP_APP_SECRET`               | App secret for HMAC verification       | yes          |

## Usage Examples

### Sending Messages

```ts
@Injectable()
export class OrderService {
  constructor(private readonly wa: WhatsAppService) {}
  async notifyCustomer(order) {
    await this.wa.sendText(order.phone, `Hi ${order.name}, your order is confirmed!`);
    await this.wa.sendMedia(order.phone, order.imageUrl, 'Your product');
  }
}
```

### Webhook Controller

```ts
import { Controller, Get, Post, Req, Headers } from '@nestjs/common';
import { WhatsAppEvents } from 'nest-whatsapp';

@Controller('whatsapp/webhook')
export class WhatsAppController {
  constructor(
    private readonly events: WhatsAppEvents,
    private readonly cs: ConfigService
  ) {}
  @Get() verify(@Req() r) {
    /*...*/
  }
  @Post() receive(@Req() r, @Headers('x-hub-signature-256') sig) {
    /*...*/
  }
}
```

`eventemitter2` / `@nestjs/event-emitter` remain optional; install one of them if you need advanced emitter features like wildcard handlers. Otherwise the module uses Node’s `events` under the hood.

### Microservice Transport

```ts
@Module({
  imports: [WhatsAppModule.forMicroservice({ host: 'localhost', port: 4000 })],
})
export class MicroAppModule {}
```

### Metrics & Health

Register Terminus and expose metrics endpoint:

```ts
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: WhatsAppMetricsService) {}
  @Get() public metrics() {
    return this.metrics.getMetrics();
  }
}
```

## CLI Schematic

```bash
nest generate whatsapp
```

## Documentation

Generate API docs:

```bash
npx typedoc --out docs src
```

## License

Apache-2.0
