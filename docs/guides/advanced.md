# Advanced Features

[← Back to README](../../README.md)

## Table of Contents

- [Prometheus Metrics](#prometheus-metrics)
- [Health Indicator](#health-indicator)
- [Microservice Transport](#microservice-transport)
- [Management APIs](#management-apis)
  - [WhatsAppMediaService](#whatsappmediaservice)
  - [WhatsAppTemplatesService](#whatsapptemplatesservice)
  - [WhatsAppPhoneNumbersService](#whatsappphonenumbersservice)
- [CLI Schematic](#cli-schematic)

---

## Prometheus Metrics

`WhatsAppMetricsService` exposes five Prometheus-compatible metrics. Inject it into a controller
to expose a `/metrics` scrape endpoint:

```ts
import { Controller, Get } from '@nestjs/common';
import { WhatsAppMetricsService } from 'nest-whatsapp';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: WhatsAppMetricsService) {}

  @Get()
  scrape() {
    return this.metrics.getMetrics();
  }
}
```

### Available metrics

| Metric                              | Type      | Labels                                   | Description                                    |
| ----------------------------------- | --------- | ---------------------------------------- | ---------------------------------------------- |
| `whatsapp_messages_sent_total`      | Counter   | `type`, `mode`                           | Successful outbound sends                      |
| `whatsapp_errors_total`             | Counter   | `type`, `mode`, `status`                 | Send errors (status = HTTP code or error code) |
| `whatsapp_webhook_events_total`     | Counter   | —                                        | Inbound webhook events received                |
| `whatsapp_request_duration_seconds` | Histogram | `type`, `mode`, `status`                 | Outbound request latency                       |
| `whatsapp_build_info`               | Gauge     | `version`, `node_version`, `environment` | Always `1` — for scrape metadata               |

---

## Health Indicator

Integrates with [Nest Terminus](https://docs.nestjs.com/recipes/terminus) to expose a health check
for the WhatsApp Graph API endpoint.

### Setup

```bash
npm install @nestjs/terminus
```

```ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { WhatsAppModule } from 'nest-whatsapp';

@Module({
  imports: [TerminusModule, WhatsAppModule.forHealth()],
})
export class HealthModule {}
```

### Usage in a health controller

```ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { WhatsAppHealthIndicator } from 'nest-whatsapp';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly whatsapp: WhatsAppHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.whatsapp.isHealthy('whatsapp')]);
  }
}
```

### Configuration

| Env variable                    | Description                                       | Default |
| ------------------------------- | ------------------------------------------------- | ------- |
| `WHATSAPP_HEALTH_TIMEOUT_MS`    | Probe timeout (ms)                                | `3000`  |
| `WHATSAPP_HEALTH_SKIP_EXTERNAL` | Skip outbound probe (useful in restricted egress) | `false` |

---

## Microservice Transport

`WhatsAppModule.forMicroservice` registers a NestJS TCP client that can talk to a separately
deployed WhatsApp microservice.

### Setup

```bash
npm install @nestjs/microservices
```

```ts
import { Module } from '@nestjs/common';
import { WhatsAppModule } from 'nest-whatsapp';

@Module({
  imports: [
    WhatsAppModule.forMicroservice({
      host: '127.0.0.1',
      port: 4000,
      clientName: 'WA_CLIENT', // optional, defaults to 'WHATSAPP_MICROSERVICE'
    }),
  ],
})
export class MessagingModule {}
```

### Sending via TCP client

```ts
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

constructor(@Inject('WA_CLIENT') private readonly client: ClientProxy) {}

async send(to: string, message: string) {
  await lastValueFrom(
    this.client.send('wa.sendText', { to, message })
  );
}
```

### Built-in message patterns (microservice example)

| Pattern           | Payload                                             |
| ----------------- | --------------------------------------------------- |
| `wa.sendText`     | `{ to, message, mode? }`                            |
| `wa.sendTemplate` | `{ to, templateName, variables?, mode? }`           |
| `wa.sendMedia`    | `{ to, mediaUrl, caption?, mode? }`                 |
| `wa.sendDocument` | `{ to, documentUrl, filename, mode? }`              |
| `wa.sendLocation` | `{ to, latitude, longitude, name, address, mode? }` |
| `wa.sendContact`  | `{ to, contacts, mode? }`                           |
| `wa.markAsRead`   | `{ messageId, mode? }`                              |

See `examples/microservice/` for a ready-to-run implementation.

---

## Management APIs

### `WhatsAppMediaService`

Upload, fetch, and delete media assets. Returns a **media ID** that can be reused in send calls.

```ts
import { Injectable } from '@nestjs/common';
import { WhatsAppMediaService, WhatsAppService, WhatsAppMode } from 'nest-whatsapp';

@Injectable()
export class MediaHandler {
  constructor(
    private readonly media: WhatsAppMediaService,
    private readonly wa: WhatsAppService
  ) {}

  async uploadAndSend(to: string, buffer: Buffer) {
    // Upload the file once
    const { id } = await this.media.uploadMedia(buffer, 'image/jpeg', 'photo.jpg');

    // Reuse the media ID in multiple sends (no re-upload)
    await this.wa.sendMedia(to, { mediaId: id }, 'Here is your photo!', WhatsAppMode.LIVE);
  }

  async getUrl(mediaId: string) {
    const info = await this.media.getMediaUrl(mediaId);
    // info.url is a short-lived (~5 min) download URL
    return info.url;
  }
}
```

| Method        | Signature                                    | Returns                    |
| ------------- | -------------------------------------------- | -------------------------- |
| `uploadMedia` | `(buffer, mimeType, filename?, clientName?)` | `{ id: string }`           |
| `getMediaUrl` | `(mediaId, clientName?)`                     | `WhatsAppMediaUrlResponse` |
| `deleteMedia` | `(mediaId, clientName?)`                     | `boolean`                  |

---

### `WhatsAppTemplatesService`

Manage message templates for your WhatsApp Business Account.

```ts
import { WhatsAppTemplatesService, WhatsAppTemplateCategory, WhatsAppMode } from 'nest-whatsapp';

// List all templates
const templates = await this.templates.listTemplates('YOUR_WABA_ID');

// Create a new template
const { id } = await this.templates.createTemplate('YOUR_WABA_ID', {
  name: 'order_shipped',
  language: 'en_US',
  category: WhatsAppTemplateCategory.UTILITY,
  components: [{ type: 'BODY', text: 'Your order {{1}} has shipped and will arrive on {{2}}.' }],
});

// Update components
await this.templates.updateTemplate(id, {
  components: [{ type: 'BODY', text: 'Updated body text {{1}}.' }],
});

// Delete by name
await this.templates.deleteTemplate('YOUR_WABA_ID', 'order_shipped');
```

| Method           | Signature                                        |
| ---------------- | ------------------------------------------------ |
| `listTemplates`  | `(wabaId, clientName?)` → `WhatsAppTemplate[]`   |
| `getTemplate`    | `(templateId, clientName?)` → `WhatsAppTemplate` |
| `createTemplate` | `(wabaId, dto, clientName?)` → `{ id }`          |
| `updateTemplate` | `(templateId, dto, clientName?)` → `boolean`     |
| `deleteTemplate` | `(wabaId, name, clientName?)` → `boolean`        |

---

### `WhatsAppPhoneNumbersService`

Manage phone numbers registered under a WABA.

```ts
import { WhatsAppPhoneNumbersService } from 'nest-whatsapp';

// List all registered numbers
const numbers = await this.phoneNumbers.listPhoneNumbers('YOUR_WABA_ID');

// Get details for a specific number
const number = await this.phoneNumbers.getPhoneNumber('PHONE_NUMBER_ID');
console.log(number.qualityRating); // WhatsAppQualityRating.GREEN

// Verify phone number ownership
await this.phoneNumbers.requestVerificationCode('PHONE_NUMBER_ID', 'SMS', 'en_US');
await this.phoneNumbers.verifyCode('PHONE_NUMBER_ID', '123456');

// Set two-step verification PIN
await this.phoneNumbers.setTwoStepPin('PHONE_NUMBER_ID', '123456');
```

| Method                    | Signature                                              |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| `listPhoneNumbers`        | `(wabaId, clientName?)` → `WhatsAppPhoneNumber[]`      |
| `getPhoneNumber`          | `(phoneNumberId, clientName?)` → `WhatsAppPhoneNumber` |
| `requestVerificationCode` | `(phoneNumberId, method: 'SMS'                         | 'VOICE', locale?, clientName?)`→`boolean` |
| `verifyCode`              | `(phoneNumberId, code, clientName?)` → `boolean`       |
| `setTwoStepPin`           | `(phoneNumberId, pin, clientName?)` → `boolean`        |

---

## CLI Schematic

Scaffold `WhatsAppModule` into an existing NestJS app:

```bash
nest generate whatsapp
```

Or use `npx schematics` directly after building:

```bash
npm run build

# Sandbox with health check + microservice client
npx schematics nest-whatsapp:whatsapp \
  --module=src/app.module.ts \
  --mode=sandbox \
  --add-health \
  --add-micro \
  --host=127.0.0.1 \
  --port=4000

# Live configuration
npx schematics nest-whatsapp:whatsapp \
  --module=src/app.module.ts \
  --mode=live \
  --business-account-id=YOUR_WABA_ID \
  --phone-number-id=YOUR_PHONE_ID \
  --access-token=YOUR_TOKEN
```

### Schematic options

| Option         | Description                                  |
| -------------- | -------------------------------------------- |
| `--module`     | Path to your app module file                 |
| `--mode`       | `sandbox` or `live`                          |
| `--add-health` | Inject `WhatsAppModule.forHealth()`          |
| `--add-micro`  | Inject `WhatsAppModule.forMicroservice(...)` |
| `--host`       | Microservice host (requires `--add-micro`)   |
| `--port`       | Microservice port (requires `--add-micro`)   |
