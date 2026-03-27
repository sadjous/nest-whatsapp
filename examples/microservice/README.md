# Microservice Example

A NestJS microservice using `nest-whatsapp` TCP client.

## Setup

- Copy env: `cp .env.example .env`
- Install deps: `npm install`
- Start: `npm start`
- Run demo client (requires service running): `npm run demo`

## Environment

- `WHATSAPP_MICROSERVICE_HOST=127.0.0.1`
- `WHATSAPP_MICROSERVICE_PORT=4000`
- `WHATSAPP_MODE=sandbox|live`
- Sandbox:
  - `WHATSAPP_SANDBOX_PHONE_NUMBER_ID=...`
  - `WHATSAPP_SANDBOX_ACCESS_TOKEN=...`
  - `WHATSAPP_SANDBOX_TEST_RECIPIENTS=+15551234567`
- Live:
  - `WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID=...`
  - `WHATSAPP_LIVE_PHONE_NUMBER_ID=...`
  - `WHATSAPP_LIVE_ACCESS_TOKEN=...`

## Notes

- This service listens with Nest microservices (TCP transport).
- Use `WhatsAppModule.forMicroservice({ host, port })` in your apps to connect.

## Message Patterns

This example exposes validated DTO-based patterns powered by `class-validator`:

- `wa.sendText` — `{ to, message, mode? }`
- `wa.sendTemplate` — `{ to, templateName, variables?, mode? }`
- `wa.sendMedia` — `{ to, mediaUrl, caption?, mode? }`
- `wa.sendDocument` — `{ to, documentUrl, filename, mode? }`
- `wa.sendLocation` — `{ to, latitude, longitude, name, address, mode? }`

Run `npm run demo` to exercise the TCP patterns end-to-end via the bundled `demo-client.ts`.

Example client (Nest):

```ts
@Injectable()
export class WaClientService {
  constructor(@Inject('WA_CLIENT') private readonly client: ClientProxy) {}
  sendText() {
    return this.client.send('wa.sendText', { to: '+15551234567', message: 'Hello' }).toPromise();
  }
}
```

## Health

- This example is microservice-only (no HTTP). To expose a health endpoint, use an HTTP app:

```ts
import { Module } from '@nestjs/common';
import { WhatsAppHealthModule, WhatsAppHealthIndicator } from 'nest-whatsapp/health';
import { TerminusModule, HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
class HealthController {
  constructor(
    private hc: HealthCheckService,
    private wa: WhatsAppHealthIndicator
  ) {}
  @Get()
  @HealthCheck()
  check() {
    return this.hc.check([() => this.wa.isHealthy('whatsapp')]);
  }
}

@Module({ imports: [TerminusModule, WhatsAppHealthModule], controllers: [HealthController] })
export class HealthModule {}
```
