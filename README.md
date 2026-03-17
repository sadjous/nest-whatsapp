# @sadjous/nest-whatsapp

[![npm version](https://img.shields.io/npm/v/@sadjous/nest-whatsapp)](https://www.npmjs.com/package/@sadjous/nest-whatsapp)
[![Build Status](https://github.com/sadjous/nest-whatsapp/actions/workflows/ci.yml/badge.svg)](https://github.com/sadjous/nest-whatsapp/actions)
[![Coverage Status](https://coveralls.io/repos/github/sadjous/nest-whatsapp/badge.svg?branch=main)](https://coveralls.io/github/sadjous/nest-whatsapp?branch=main)
[![Docs](https://img.shields.io/badge/docs-pages-blue)](https://sadjous.github.io/nest-whatsapp/)

NestJS module for seamless integration with the WhatsApp Cloud API, supporting sandbox & live modes, multi-clients, webhooks, microservice transport, metrics, and health checks.

## Features

- Send 10 message types: text, image, audio, document, location, template, video, sticker, reaction, and interactive — all returning the message ID (`Promise<string>`) with optional reply threading via `replyToMessageId`
- Session management helpers (`startSession`, `endSession`)
- Sandbox mode for rapid testing
- Live mode for production with template enforcement and rate limits
- Webhook verification & event emitting
- Nest microservice transport (TCP)
- Prometheus metrics and Nest Terminus health indicator
- Full TypeScript support (CJS & ESM)
- Easy configuration via `forRoot` / `forRootAsync`
- CLI schematic: `nest generate whatsapp`

## Quickstart

```bash
npm install @sadjous/nest-whatsapp
```

**Step 1:** Create the config file `src/config/whatsapp.config.ts`:

```ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export default registerAs('whatsapp', () => ({
  mode: process.env.WHATSAPP_MODE,
  sandbox: {
    testPhoneNumberId: process.env.WHATSAPP_SANDBOX_PHONE_NUMBER_ID,
    temporaryAccessToken: process.env.WHATSAPP_SANDBOX_ACCESS_TOKEN,
    testRecipients: process.env.WHATSAPP_SANDBOX_TEST_RECIPIENTS?.split(',') || [],
  },
  live: {
    businessAccountId: process.env.WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID,
    phoneNumberId: process.env.WHATSAPP_LIVE_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_LIVE_ACCESS_TOKEN,
  },
}));

export const WhatsappConfigSchema = Joi.object({
  WHATSAPP_MODE: Joi.string().valid('sandbox', 'live').required(),
  WHATSAPP_SANDBOX_PHONE_NUMBER_ID: Joi.string().when('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.required(),
  }),
  WHATSAPP_SANDBOX_ACCESS_TOKEN: Joi.string().when('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.required(),
  }),
  WHATSAPP_SANDBOX_TEST_RECIPIENTS: Joi.string().when('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.required(),
  }),
  WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID: Joi.string().when('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.required(),
  }),
  WHATSAPP_LIVE_PHONE_NUMBER_ID: Joi.string().when('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.required(),
  }),
  WHATSAPP_LIVE_ACCESS_TOKEN: Joi.string().when('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.required(),
  }),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: Joi.string().required(),
  WHATSAPP_APP_SECRET: Joi.string().required(),
});
```

**Step 2:** Set up your module `src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import whatsappConfig, { WhatsappConfigSchema } from './config/whatsapp.config';
import { WhatsAppModule } from '@sadjous/nest-whatsapp';

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
})
export class AppModule {}
```

## Configuration

Use environment variables or secret manager via `forRootAsync`:

| Variable                            | Description                               | Required             |
| ----------------------------------- | ----------------------------------------- | -------------------- |
| `WHATSAPP_MODE`                     | `sandbox` or `live`                       | yes                  |
| `WHATSAPP_SANDBOX_PHONE_NUMBER_ID`  | Sandbox phone number ID                   | if `sandbox`         |
| `WHATSAPP_SANDBOX_ACCESS_TOKEN`     | Sandbox temporary access token            | if `sandbox`         |
| `WHATSAPP_SANDBOX_TEST_RECIPIENTS`  | Comma-separated test recipient numbers    | if `sandbox`         |
| `WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID` | Live business account ID                  | if `live`            |
| `WHATSAPP_LIVE_PHONE_NUMBER_ID`     | Live phone number ID                      | if `live`            |
| `WHATSAPP_LIVE_ACCESS_TOKEN`        | Live long-lived access token              | if `live`            |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`     | Webhook verification token                | yes                  |
| `WHATSAPP_APP_SECRET`               | App secret for HMAC verification          | yes                  |
| `WHATSAPP_WEBHOOK_MAX_BODY_BYTES`   | Maximum raw webhook payload size          | no (default 2 MB)    |
| `WHATSAPP_MASK_PHONE_LOGS`          | Mask phone numbers in logs (`true/false`) | no (default `true`)  |
| `WHATSAPP_LOG_MESSAGE_BODIES`       | Log outbound payload bodies (dangerous)   | no (default `false`) |
| `WHATSAPP_HEALTH_TIMEOUT_MS`        | Graph API health probe timeout (ms)       | no (default `3000`)  |
| `WHATSAPP_HEALTH_SKIP_EXTERNAL`     | Skip outbound health probe (`true/false`) | no (default `false`) |

### Advanced HTTP settings (optional)

- `WHATSAPP_GRAPH_API_VERSION` — Graph API version used for outbound requests. Default: `v17.0`.
- `WHATSAPP_HTTP_TIMEOUT_MS` — Axios request timeout in milliseconds. Default: `10000`.
- `WHATSAPP_HTTP_RETRIES` — Number of retry attempts for retryable errors (network/5xx/429). Default: `2`.
- `WHATSAPP_HTTP_MAX_RETRY_DELAY_MS` — Cap for exponential backoff with jitter. Default: `5000`.
- Per-client overrides: set `httpConfig` on each `WhatsAppClientOptions` entry to merge in custom Axios settings (proxies, params, etc.). Authorization headers are managed automatically.

### Runtime tuning

To override the global HTTP/retry/logging defaults via DI instead of environment variables, provide `WHATSAPP_RUNTIME_OPTIONS`:

```ts
import { Module } from '@nestjs/common';
import { WhatsAppModule, WHATSAPP_RUNTIME_OPTIONS } from '@sadjous/nest-whatsapp';

@Module({
  imports: [WhatsAppModule.forRoot(/* ... */)],
  providers: [
    {
      provide: WHATSAPP_RUNTIME_OPTIONS,
      useValue: { httpTimeoutMs: 5000, maskPhoneLogs: false },
    },
  ],
})
export class MessagingModule {}
```

When this provider is absent, the module falls back to the environment variables listed above.

## Usage Examples

### Handling Incoming Messages

The webhook endpoint (`GET/POST /whatsapp/webhook`) is **automatically registered** when you import `WhatsAppModule`. You do not need to write a controller for it. To react to incoming messages, inject `WhatsAppEvents` into your own service and subscribe in `onModuleInit`:

```ts
import { Injectable, OnModuleInit } from ‘@nestjs/common’;
import { WhatsAppEvents } from ‘@sadjous/nest-whatsapp’;

@Injectable()
export class MessageHandlerService implements OnModuleInit {
  constructor(private readonly events: WhatsAppEvents) {}

  onModuleInit(): void {
    this.events.onTextReceived(({ message, contact }) => {
      console.log(‘Text:’, message.text.body, ‘from’, contact?.wa_id);
    });
  }
}
```

> Tip: install `eventemitter2` or `@nestjs/event-emitter` if you want wildcard listeners (`onAny`). Without them the module falls back to Node’s `events` emitter, which supports the same API used here but without the extra helpers.

### Microservice Transport

```ts
@Module({
  imports: [WhatsAppModule.forMicroservice({ host: 'localhost', port: 4000 })],
})
export class MicroAppModule {}
```

### Metrics & Health

```ts
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: WhatsAppMetricsService) {}
  @Get() public metrics() {
    return this.metrics.getMetrics();
  }
}
```

Exposed Prometheus metrics (names are stable and safe to scrape):

- `whatsapp_messages_sent_total` — counter, increments on successful message sends. Labels: `type`, `mode`.
- `whatsapp_errors_total` — counter, increments on send errors. Labels: `type`, `mode`, `status`.
- `whatsapp_webhook_events_total` — counter, increments on webhook receive.
- `whatsapp_request_duration_seconds` — histogram, outbound request latency. Labels: `type`, `mode`, `status`.
- `whatsapp_build_info` — gauge with labels `version`, `node_version`, `environment`, always `1` for scrape-friendly metadata.

Tip: use relabeling to add instance labels; see the example app for the `/metrics` endpoint.

### Webhook Security & CSRF

- Signature verification: the controller validates `x-hub-signature-256` with an HMAC‐SHA256 using your `WHATSAPP_APP_SECRET`, using constant‑time comparison.
- Raw body is required and size-limited: set `WHATSAPP_WEBHOOK_MAX_BODY_BYTES` (default `2_000_000`) and ensure your Nest bootstrap captures the raw buffer with the same `bodyParser.json` limit:

```ts
app.use(
  bodyParser.json({
    limit: '2mb',
    verify: (req, _res, buf) => ((req as any).rawBody = buf),
  })
);
```

- CSRF: not required for the WhatsApp webhook route because requests are authenticated by HMAC and originate from Meta. For your own browser‑facing endpoints, configure CSRF as appropriate for your app.

### Sandbox Safety

- Sandbox sends are restricted to the `testRecipients` allow‑list supplied in `WhatsAppSandboxOptions`. Calls to `send*` will fail fast if the list is empty or the recipient is not whitelisted.
- Logs mask phone numbers by default; opt out via `WHATSAPP_MASK_PHONE_LOGS=false`.
- Payload bodies are **not** logged unless you explicitly enable `WHATSAPP_LOG_MESSAGE_BODIES=true`.

## Typed Events & Helpers

- Facade `WhatsAppEvents` exposes typed events:
  - Raw: `message_received`
  - Sub-events: `text_received`, `image_received`, `audio_received`, `document_received`, `location_received`, `template_received`, `interactive_received`, `contacts_received`, `system_received`, `order_received`, `product_received`, `reaction_received`.
  - Delivery receipts: `status_received` — carries `WhatsAppStatusEvent` with delivery and read receipt data; subscribe via `onStatusReceived()` / `offStatusReceived()`.
- Subscribe (inside `onModuleInit` or a constructor-safe lifecycle hook):

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { WhatsAppEvents } from '@sadjous/nest-whatsapp';

@Injectable()
export class MessageHandlerService implements OnModuleInit {
  constructor(private readonly events: WhatsAppEvents) {}

  onModuleInit(): void {
    this.events.onTextReceived(({ message, contact }) => {
      console.log('Text:', message.text.body, 'from', contact?.wa_id);
    });
  }
}
```

- Helpers in `utils/webhook`:
  - `getFirstMessage`, `getFirstContact`, `getAllMessages`, `getAllStatuses`
  - Type guards: `isTextMessage`, `isImageMessage`, `isInteractiveMessage`, etc.

## Health & Microservice (optional)

### Health Indicator

- Install peer: `npm i -S @nestjs/terminus`
- Import health providers only when needed:
- `WHATSAPP_HEALTH_TIMEOUT_MS` controls the outbound probe timeout; use `WHATSAPP_HEALTH_SKIP_EXTERNAL=true` for environments without egress (config readiness is still checked).

```ts
import { Module } from '@nestjs/common';
import { WhatsAppModule } from '@sadjous/nest-whatsapp';

@Module({
  imports: [WhatsAppModule.forHealth()],
})
export class HealthModule {}
```

### Microservice Client

- Install peer if using microservices: `npm i -S @nestjs/microservices`
- Register a TCP client with lazy-loaded microservices support:

```ts
import { Module } from '@nestjs/common';
import { WhatsAppModule } from '@sadjous/nest-whatsapp';

@Module({
  imports: [
    WhatsAppModule.forMicroservice({ host: '127.0.0.1', port: 4000, clientName: 'WA_CLIENT' }),
  ],
})
export class MessagingModule {}
```

- `clientName` must be non-empty when provided; defaults to `WHATSAPP_MICROSERVICE`.
- Use DTOs + `class-validator` to validate inbound TCP payloads (see `examples/microservice` for ready-made `wa.sendText`, `wa.sendTemplate`, `wa.sendMedia`, `wa.sendDocument`, and `wa.sendLocation` patterns).

## CLI Schematic

```bash
nest generate whatsapp
```

### Schematic Usage (standalone)

- Build first (includes schematics): `npm run build`
- Sandbox with health + micro:
  - `npx schematics @sadjous/nest-whatsapp:whatsapp --module=src/app.module.ts --mode=sandbox --add-health --add-micro --host=127.0.0.1 --port=4000`
- Sandbox with explicit creds:
  - `npx schematics @sadjous/nest-whatsapp:whatsapp --module=src/app.module.ts --mode=sandbox --test-phone-number-id=123 --temporary-access-token=TOKEN --test-recipients=+15551234567,+15557654321`
- Live configuration:
  - `npx schematics @sadjous/nest-whatsapp:whatsapp --module=src/app.module.ts --mode=live --business-account-id=BA_ID --phone-number-id=PN_ID --access-token=ACCESS_TOKEN`

#### Notes

- Options use dashed names (e.g., `--add-health`, not `--addHealth`).
- The schematic now wires `WhatsAppModule.forRootAsync(...)` + `ConfigModule` by default; adjust the generated factory to map your configuration layer if needed.

## Documentation

```bash
npx typedoc --out docs src
```

## Migration Notes

- Webhook payloads are now capped by `WHATSAPP_WEBHOOK_MAX_BODY_BYTES` (default 2 MB). Increase the limit explicitly if you previously accepted larger requests.
- Sandbox sends strictly enforce `testRecipients`; provide at least one recipient or use live mode.
- Phone numbers are masked in logs by default and payload bodies remain hidden unless `WHATSAPP_LOG_MESSAGE_BODIES=true`.
- The schematic and examples now default to `WhatsAppModule.forRootAsync` with `@nestjs/config`. Update custom templates accordingly.

## Run Examples

- Install example deps: `npm run examples:install`
- Option A (recommended): use the published package (no extra steps).
- Option B (local development): build and install locally
  - `npm run build && npm pack` (note the generated `.tgz` file)
  - In each example folder: `npm install ../../sadjous-nest-whatsapp-*.tgz`

### Basic HTTP example

- Env (sandbox mode):
  - `WHATSAPP_MODE=sandbox`
  - `WHATSAPP_SANDBOX_PHONE_NUMBER_ID=...`
  - `WHATSAPP_SANDBOX_ACCESS_TOKEN=...`
  - `WHATSAPP_SANDBOX_TEST_RECIPIENTS=+15551234567`
- Env (live mode):
  - `WHATSAPP_MODE=live`
  - `WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID=...`
  - `WHATSAPP_LIVE_PHONE_NUMBER_ID=...`
  - `WHATSAPP_LIVE_ACCESS_TOKEN=...`
- Run: `npm run example:basic`
- Send a message:
  - `curl -X POST localhost:3000/messages/text -H 'Content-Type: application/json' -d '{"to":"+15551234567","message":"Hello"}'`

### Microservice example

- Env:
  - `WHATSAPP_MICROSERVICE_HOST=127.0.0.1`
  - `WHATSAPP_MICROSERVICE_PORT=4000`
- Run: `npm run example:micro`
- Run demo client (with the microservice online): `npm --prefix examples/microservice run demo`

## License

Apache-2.0
