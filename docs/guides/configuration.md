# Configuration

[← Back to README](../../README.md)

## Table of Contents

- [Environment Variables](#environment-variables)
- [Runtime Options (DI)](#runtime-options-di)
- [Per-Client HTTP Overrides](#per-client-http-overrides)
- [Validation Schema (Joi)](#validation-schema-joi)

---

## Environment Variables

### Core

| Variable                        | Description                                               | Required |
| ------------------------------- | --------------------------------------------------------- | -------- |
| `WHATSAPP_MODE`                 | `sandbox` or `live`                                       | **yes**  |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token used to verify the webhook challenge from Meta      | **yes**  |
| `WHATSAPP_APP_SECRET`           | App secret for HMAC-SHA256 webhook signature verification | **yes**  |

### Sandbox credentials

| Variable                           | Description                                            | Required when  |
| ---------------------------------- | ------------------------------------------------------ | -------------- |
| `WHATSAPP_SANDBOX_PHONE_NUMBER_ID` | Test phone number ID from the Meta dashboard           | `mode=sandbox` |
| `WHATSAPP_SANDBOX_ACCESS_TOKEN`    | Temporary access token (valid ~24h)                    | `mode=sandbox` |
| `WHATSAPP_SANDBOX_TEST_RECIPIENTS` | Comma-separated list of allowed test recipient numbers | `mode=sandbox` |

> ⚠️ **Sandbox safety:** messages can only be sent to numbers in `WHATSAPP_SANDBOX_TEST_RECIPIENTS`. This prevents accidentally messaging real users. See [Modes](./modes.md) for details.

### Live credentials

| Variable                            | Description                         | Required when |
| ----------------------------------- | ----------------------------------- | ------------- |
| `WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account (WABA) ID | `mode=live`   |
| `WHATSAPP_LIVE_PHONE_NUMBER_ID`     | Live phone number ID                | `mode=live`   |
| `WHATSAPP_LIVE_ACCESS_TOKEN`        | Long-lived system user access token | `mode=live`   |

### HTTP & retry tuning

| Variable                           | Description                               | Default |
| ---------------------------------- | ----------------------------------------- | ------- |
| `WHATSAPP_GRAPH_API_VERSION`       | Graph API version (e.g. `v25.0`)          | `v25.0` |
| `WHATSAPP_HTTP_TIMEOUT_MS`         | Outbound request timeout (ms)             | `10000` |
| `WHATSAPP_HTTP_RETRIES`            | Retry attempts for network/5xx/429 errors | `2`     |
| `WHATSAPP_HTTP_MAX_RETRY_DELAY_MS` | Max exponential backoff cap (ms)          | `5000`  |

### Webhook

| Variable                          | Description                          | Default          |
| --------------------------------- | ------------------------------------ | ---------------- |
| `WHATSAPP_WEBHOOK_MAX_BODY_BYTES` | Max raw webhook payload size (bytes) | `2000000` (2 MB) |

### Logging

| Variable                      | Description                              | Default |
| ----------------------------- | ---------------------------------------- | ------- |
| `WHATSAPP_MASK_PHONE_LOGS`    | Mask phone numbers in log output         | `true`  |
| `WHATSAPP_LOG_MESSAGE_BODIES` | Log outbound payload bodies ⚠️ sensitive | `false` |

### Health check

| Variable                        | Description                        | Default |
| ------------------------------- | ---------------------------------- | ------- |
| `WHATSAPP_HEALTH_TIMEOUT_MS`    | Outbound health probe timeout (ms) | `3000`  |
| `WHATSAPP_HEALTH_SKIP_EXTERNAL` | Skip outbound connectivity probe   | `false` |

---

## Runtime Options (DI)

For fine-grained programmatic control, provide `WHATSAPP_RUNTIME_OPTIONS`. When present, it overrides the environment variable defaults.

```ts
import { Module } from '@nestjs/common';
import { WhatsAppModule, WHATSAPP_RUNTIME_OPTIONS } from 'nest-whatsapp';

@Module({
  imports: [WhatsAppModule.forRoot(/* client options */)],
  providers: [
    {
      provide: WHATSAPP_RUNTIME_OPTIONS,
      useValue: {
        apiVersion: 'v25.0',
        httpTimeoutMs: 5000,
        httpRetries: 3,
        httpMaxRetryDelayMs: 8000,
        maskPhoneLogs: false,
        logMessageBodies: false,
      },
    },
  ],
})
export class AppModule {}
```

### `WhatsAppRuntimeOptions` interface

```ts
interface WhatsAppRuntimeOptions {
  apiVersion?: string; // Graph API version
  httpTimeoutMs?: number; // Request timeout
  httpRetries?: number; // Retry attempts
  httpMaxRetryDelayMs?: number; // Max backoff delay
  maskPhoneLogs?: boolean; // Mask phone numbers in logs
  logMessageBodies?: boolean; // Log outbound message payloads
}
```

---

## Per-Client HTTP Overrides

You can pass custom Axios settings per client (e.g. proxy, extra headers) via `httpConfig`:

```ts
WhatsAppModule.forRoot({
  mode: WhatsAppMode.LIVE,
  businessAccountId: '...',
  phoneNumberId: '...',
  accessToken: '...',
  httpConfig: {
    proxy: { host: '10.0.0.1', port: 8080 },
    timeout: 15000,
  },
});
```

`Authorization` headers are managed automatically — do not set them in `httpConfig`.

---

## Validation Schema (Joi)

If you use `@nestjs/config`, you can enforce the required env vars at startup with the built-in Joi schema:

```ts
import { ConfigModule } from '@nestjs/config';
import { WhatsappConfigSchema } from './whatsapp.config';

ConfigModule.forRoot({
  validationSchema: WhatsappConfigSchema,
});
```

The schema validates that `WHATSAPP_MODE` is either `sandbox` or `live`, and requires the corresponding credential variables conditionally.
