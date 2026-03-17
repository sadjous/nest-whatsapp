# Basic HTTP Example

A minimal NestJS app using `@sadjous/nest-whatsapp` over HTTP.

## Setup

- Copy env: `cp .env.example .env`
- Install deps: `npm install`
- Start: `npm start`

## Environment

Set either sandbox or live mode:

Sandbox:

- `WHATSAPP_MODE=sandbox`
- `WHATSAPP_SANDBOX_PHONE_NUMBER_ID=...`
- `WHATSAPP_SANDBOX_ACCESS_TOKEN=...`
- `WHATSAPP_SANDBOX_TEST_RECIPIENTS=+15551234567`

Live:

- `WHATSAPP_MODE=live`
- `WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID=...`
- `WHATSAPP_LIVE_PHONE_NUMBER_ID=...`
- `WHATSAPP_LIVE_ACCESS_TOKEN=...`

## Messaging API

Base URL: `http://localhost:3000`

- Send text
  - `POST /messages/text` — body: `{ "to": "+1555...", "message": "Hello" }`
- Send image (media)
  - `POST /messages/media` — body: `{ "to": "+1555...", "url": "https://.../image.jpg", "caption": "Optional" }`
- Send audio
  - `POST /messages/audio` — body: `{ "to": "+1555...", "url": "https://.../audio.mp3" }`
- Send document
  - `POST /messages/document` — body: `{ "to": "+1555...", "url": "https://.../file.pdf", "filename": "file.pdf" }`
- Send location
  - `POST /messages/location` — body: `{ "to": "+1555...", "latitude": 48.8584, "longitude": 2.2945, "name": "Eiffel Tower", "address": "Paris" }`
- Send template
  - `POST /messages/template` — body: `{ "to": "+1555...", "templateName": "order_update", "variables": ["John", "#1234"] }`
- Start/end session helpers
  - `POST /messages/start-session` — body: `{ "to": "+1555..." }`
  - `POST /messages/end-session` — body: `{ "to": "+1555..." }`

### Via Microservice (TCP)

This example also includes a TCP client to the microservice example. Ensure the microservice is running and env is set:

- `WHATSAPP_MICROSERVICE_HOST=127.0.0.1`
- `WHATSAPP_MICROSERVICE_PORT=4000`

Endpoint:

- `POST /micro/send-text` — body: `{ "to": "+1555...", "message": "Hello", "mode": "sandbox|live" }`

Example:

```
curl -X POST localhost:3000/micro/send-text \
  -H 'Content-Type: application/json' \
  -d '{"to":"+15551234567","message":"Hello from TCP"}'
```

Examples:

```
curl -X POST localhost:3000/messages/text -H 'Content-Type: application/json' -d '{"to":"+15551234567","message":"Hello"}'
curl -X POST localhost:3000/messages/media -H 'Content-Type: application/json' -d '{"to":"+15551234567","url":"https://picsum.photos/300","caption":"Hi"}'
```

## Health

- Endpoint: `GET /health`
- Example:

```
curl http://localhost:3000/health
```

- Response (example):

```
{
  "status": "ok",
  "info": { "whatsapp": { "status": "up" } },
  "error": {},
  "details": { "whatsapp": { "status": "up" } }
}
```

## Webhook & Events

- Verify endpoint: `GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=123`
- Receive endpoint: `POST /whatsapp/webhook` with header `x-hub-signature-256`
- The app validates the HMAC signature and emits typed events via `WhatsAppEvents`.
- A simple logger (`WaEventsLogger`) prints incoming events to the console.
- Raw body capture is enforced with a `2mb` limit to match `WHATSAPP_WEBHOOK_MAX_BODY_BYTES`; adjust both if you need to accept larger payloads.

CSRF note: the webhook route does not require CSRF because requests are authenticated by HMAC from WhatsApp. Apply CSRF protection only to browser‑session endpoints as needed.

## Metrics

- Prometheus metrics: `GET /metrics`
- Includes default Node metrics and WhatsApp counters.
