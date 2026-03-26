# Modes: Sandbox vs Live

[← Back to README](../../README.md)

## Table of Contents

- [Overview](#overview)
- [Sandbox Mode](#sandbox-mode)
- [Live Mode](#live-mode)
- [The testRecipients Allow-List](#the-testrecipients-allow-list)
- [Switching Between Modes at Runtime](#switching-between-modes-at-runtime)
- [Running Both Modes Simultaneously](#running-both-modes-simultaneously)

---

## Overview

`nest-whatsapp` supports two operation modes, controlled by the `WhatsAppMode` enum:

| Mode                   | Enum value  | Use for                     |
| ---------------------- | ----------- | --------------------------- |
| `WhatsAppMode.SANDBOX` | `'sandbox'` | Local development & testing |
| `WhatsAppMode.LIVE`    | `'live'`    | Production                  |

```ts
import { WhatsAppMode } from 'nest-whatsapp';
```

---

## Sandbox Mode

Sandbox mode uses **temporary credentials** from the Meta developer dashboard (valid ~24 hours).
It enforces a strict **recipient allow-list** to prevent accidentally sending messages to real
users during development.

```ts
{
  mode: WhatsAppMode.SANDBOX,
  testPhoneNumberId: '123456789',
  temporaryAccessToken: 'EAAxxxxxxx',
  testRecipients: ['+15551234567', '+15559876543'],
}
```

**Limitations:**

- You can only send to numbers listed in `testRecipients`
- Tokens expire and must be refreshed from the Meta dashboard
- Some message types may behave differently than in production

---

## Live Mode

Live mode uses **long-lived system user tokens** and has no recipient restrictions.

```ts
{
  mode: WhatsAppMode.LIVE,
  businessAccountId: 'YOUR_WABA_ID',
  phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
  accessToken: 'EAAxxxxxxx',  // system user token — never expires unless revoked
}
```

---

## The testRecipients Allow-List

When `mode: WhatsAppMode.SANDBOX`, every outbound send method checks that the recipient number
is in the `testRecipients` list. If it is not, the call throws `WhatsAppSandboxRecipientException`
immediately — **before** making any HTTP request.

### Error example

```
WhatsAppSandboxRecipientException: Recipient +1555****567 is not in the sandbox testRecipients allow-list.
Add it to your config: testRecipients: ['+15551234567']
Or use mode: WhatsAppMode.LIVE for production.
```

### Fix

Add the recipient's full number (E.164 format) to your config:

```ts
testRecipients: ['+15551234567', '+15559876543'];
```

Or via environment variable (comma-separated):

```env
WHATSAPP_SANDBOX_TEST_RECIPIENTS=+15551234567,+15559876543
```

### Why this exists

This is a deliberate safety feature. Without an allow-list, a misconfigured environment variable
(e.g. accidentally setting `WHATSAPP_MODE=sandbox` instead of `live`) could silently send messages
to wrong recipients.

---

## Switching Between Modes at Runtime

The mode is determined per **send call**, not globally. Every send method accepts an optional
`clientName: WhatsAppMode` parameter:

```ts
// Use sandbox for testing a specific flow
await wa.sendText('+15551234567', 'test', WhatsAppMode.SANDBOX);

// Use live for production traffic
await wa.sendText('+15559876543', 'hello', WhatsAppMode.LIVE);
```

The default is `WhatsAppMode.LIVE` when omitted.

---

## Running Both Modes Simultaneously

You can register both clients at the same time. This is useful for gradual rollouts or A/B
scenarios:

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

Then call the appropriate client per message:

```ts
await wa.sendText(testNumber, 'Test message', WhatsAppMode.SANDBOX);
await wa.sendTemplate(realUser, 'welcome', [], WhatsAppMode.LIVE);
```
