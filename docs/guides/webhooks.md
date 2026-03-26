# Webhooks & Events

[← Back to README](../../README.md)

## Table of Contents

- [Webhook Registration](#webhook-registration)
- [Bootstrap Setup](#bootstrap-setup)
- [Receiving Events](#receiving-events)
- [Available Events](#available-events)
- [Webhook Security](#webhook-security)
- [Utility Helpers](#utility-helpers)

---

## Webhook Registration

The webhook controller (`GET /whatsapp/webhook` and `POST /whatsapp/webhook`) is **automatically
mounted** when you import `WhatsAppModule`. You do not need to create a controller for it.

### Meta Developer Console setup

1. Set the **Webhook URL** to `https://your-domain.com/whatsapp/webhook`
2. Set the **Verify Token** to the same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Subscribe to the `messages` field under your app's WhatsApp product

---

## Bootstrap Setup

The webhook controller requires the **raw request body** to verify HMAC-SHA256 signatures.
Configure your NestJS bootstrap file accordingly:

```ts
// main.ts
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(
    bodyParser.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  await app.listen(3000);
}
bootstrap();
```

> Set `WHATSAPP_WEBHOOK_MAX_BODY_BYTES` to match your `bodyParser` limit if you change it
> from the default 2 MB.

---

## Receiving Events

Inject `WhatsAppEvents` into your service and subscribe in `onModuleInit`:

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { WhatsAppEvents } from 'nest-whatsapp';

@Injectable()
export class MessageHandlerService implements OnModuleInit {
  constructor(private readonly events: WhatsAppEvents) {}

  onModuleInit(): void {
    this.events.onTextReceived(({ message, contact }) => {
      console.log(`Text from ${contact?.wa_id}: ${message.text.body}`);

      // Reply immediately — you now have 24 hours to send free-form messages to this user
    });

    this.events.onImageReceived(({ message, contact }) => {
      console.log('Image received, mediaId:', message.image.id);
    });

    this.events.onStatusReceived(({ status }) => {
      console.log(`Message ${status.id} status: ${status.status}`); // sent | delivered | read
    });

    this.events.onReferralReceived(({ referral, contact }) => {
      console.log(`Ad click from ${contact?.wa_id}, ad: ${referral.headline}`);
    });
  }
}
```

To unsubscribe, use the `off*` counterparts (e.g. `offTextReceived`).

---

## Available Events

| Method                  | Payload type                 | Fired when                          |
| ----------------------- | ---------------------------- | ----------------------------------- |
| `onTextReceived`        | `WhatsAppTextEvent`          | Inbound text message                |
| `onImageReceived`       | `WhatsAppImageEvent`         | Inbound image                       |
| `onAudioReceived`       | `WhatsAppAudioEvent`         | Inbound audio                       |
| `onDocumentReceived`    | `WhatsAppDocumentEvent`      | Inbound document                    |
| `onLocationReceived`    | `WhatsAppLocationEvent`      | Inbound location                    |
| `onVideoReceived`       | `WhatsAppVideoEvent`         | Inbound video                       |
| `onStickerReceived`     | `WhatsAppStickerEvent`       | Inbound sticker                     |
| `onTemplateReceived`    | `WhatsAppTemplateEvent`      | Inbound template reply              |
| `onInteractiveReceived` | `WhatsAppInteractiveEvent`   | Inbound interactive reply           |
| `onContactsReceived`    | `WhatsAppContactsEvent`      | Inbound contact card                |
| `onReactionReceived`    | `WhatsAppReactionEvent`      | Inbound reaction                    |
| `onOrderReceived`       | `WhatsAppOrderEvent`         | Inbound order (catalog)             |
| `onProductReceived`     | `WhatsAppProductEvent`       | Inbound product inquiry             |
| `onSystemReceived`      | `WhatsAppSystemEvent`        | System message (e.g. number change) |
| `onStatusReceived`      | `WhatsAppStatusEvent`        | Delivery / read receipt             |
| `onReferralReceived`    | `WhatsAppReferralEvent`      | Click-to-WhatsApp ad referral       |
| `onMessageReceived`     | raw `WhatsAppWebhookPayload` | Any inbound message (raw)           |

---

## Webhook Security

### HMAC-SHA256 signature verification

Every inbound `POST` to `/whatsapp/webhook` is verified:

1. The controller reads the `x-hub-signature-256` header from Meta
2. It computes `HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET)`
3. It compares signatures using **constant-time comparison** to prevent timing attacks
4. Requests with invalid or missing signatures receive `403 Forbidden`

Set `WHATSAPP_APP_SECRET` to the value found in **Meta App Dashboard → App Settings → App Secret**.

### Payload size limiting

Payloads larger than `WHATSAPP_WEBHOOK_MAX_BODY_BYTES` (default 2 MB) are rejected with
`413 Payload Too Large` before processing.

---

## Utility Helpers

`nest-whatsapp` exports helpers from `utils/webhook` for working with raw webhook payloads:

```ts
import {
  getFirstMessage,
  getFirstContact,
  getAllMessages,
  getAllStatuses,
  isTextMessage,
  isImageMessage,
  isInteractiveMessage,
} from 'nest-whatsapp';

// Extract the first message from a raw payload
const message = getFirstMessage(payload);
const contact = getFirstContact(payload);

// Type guards
if (isTextMessage(message)) {
  console.log(message.text.body);
}

if (isImageMessage(message)) {
  console.log(message.image.id);
}
```
