# Sending Messages

[← Back to README](../../README.md)

## Table of Contents

- [24-Hour Messaging Window](#24-hour-messaging-window)
- [Client Selection](#client-selection)
- [Text Messages](#text-messages)
- [Media Messages](#media-messages)
- [Audio](#audio)
- [Documents](#documents)
- [Location](#location)
- [Video](#video)
- [Stickers](#stickers)
- [Template Messages](#template-messages)
- [Reactions](#reactions)
- [Interactive Messages](#interactive-messages)
- [Contact Cards](#contact-cards)
- [Mark as Read](#mark-as-read)
- [Session Helpers](#session-helpers)
- [Reply Threading](#reply-threading)

---

## 24-Hour Messaging Window

> ⚠️ **Important — WhatsApp Business Policy**
>
> You can only send **free-form text messages** (and most other message types) to a user who has
> **messaged your business first within the last 24 hours**.
>
> If you try to initiate a conversation with a user who has not contacted you recently, the
> WhatsApp API will return an error. In that case, you must use a **template message**
> (`sendTemplate`) to open the conversation — templates are pre-approved by Meta and can be
> sent at any time.
>
> **TL;DR:** Text → only after the user writes first. Template → any time.

---

## Client Selection

Every send method accepts an optional `clientName` parameter of type `WhatsAppMode`:

```ts
import { WhatsAppMode } from 'nest-whatsapp';

// WhatsAppMode.SANDBOX — uses sandbox credentials and enforces testRecipients
// WhatsAppMode.LIVE    — uses live credentials (default)

await wa.sendText('+15551234567', 'Hello!', WhatsAppMode.LIVE);
await wa.sendText('+15559876543', 'Test!', WhatsAppMode.SANDBOX);
```

The default for all methods is `WhatsAppMode.LIVE`.

---

## Text Messages

```ts
const messageId = await wa.sendText(
  '+15551234567', // recipient (E.164 format)
  'Hello, world!', // message body
  WhatsAppMode.LIVE // client (optional, default: LIVE)
);
```

With reply threading:

```ts
await wa.sendText('+15551234567', 'Got it!', WhatsAppMode.LIVE, originalMessageId);
```

---

## Media Messages

Send an image by URL or by a previously uploaded media ID:

```ts
// By URL
await wa.sendMedia('+15551234567', 'https://example.com/image.jpg', 'Caption text');

// By media ID (uploaded via WhatsAppMediaService)
await wa.sendMedia('+15551234567', { mediaId: 'abc123' }, 'Caption text');

// By URL object
await wa.sendMedia('+15551234567', { url: 'https://example.com/image.jpg' }, 'Caption text');
```

Signature:

```ts
sendMedia(to, source: string | WhatsAppMediaSource, caption?, clientName?, replyToMessageId?)
```

---

## Audio

```ts
await wa.sendAudio('+15551234567', 'https://example.com/audio.ogg');
await wa.sendAudio('+15551234567', { mediaId: 'audio-id-123' });
```

Signature:

```ts
sendAudio(to, source: string | WhatsAppMediaSource, clientName?, replyToMessageId?)
```

---

## Documents

```ts
await wa.sendDocument(
  '+15551234567',
  'https://example.com/report.pdf',
  'monthly-report.pdf', // filename shown to recipient
  WhatsAppMode.LIVE
);
```

Signature:

```ts
sendDocument(to, source: string | WhatsAppMediaSource, filename, clientName?, replyToMessageId?)
```

---

## Location

```ts
await wa.sendLocation(
  '+15551234567',
  48.8584, // latitude
  2.2945, // longitude
  'Eiffel Tower',
  'Champ de Mars, 5 Av. Anatole France, Paris'
);
```

Signature:

```ts
sendLocation(to, latitude, longitude, name, address, clientName?, replyToMessageId?)
```

---

## Video

```ts
await wa.sendVideo('+15551234567', 'https://example.com/clip.mp4', 'Watch this!');
await wa.sendVideo('+15551234567', { mediaId: 'video-id-456' }, 'Clip');
```

Signature:

```ts
sendVideo(to, source: string | WhatsAppMediaSource, caption?, clientName?, replyToMessageId?)
```

---

## Stickers

```ts
await wa.sendSticker('+15551234567', 'https://example.com/sticker.webp');
await wa.sendSticker('+15551234567', { mediaId: 'sticker-id-789' });
```

Signature:

```ts
sendSticker(to, source: string | WhatsAppMediaSource, clientName?, replyToMessageId?)
```

---

## Template Messages

Templates are pre-approved message formats that can be sent to **any** user at any time, even
without a prior conversation. Use them to initiate conversations or send transactional messages
outside the 24-hour window.

```ts
await wa.sendTemplate(
  '+15551234567',
  'order_shipped', // template name (must be approved in Meta)
  ['ORD-12345', 'tomorrow'], // variable substitutions {{1}}, {{2}}, ...
  WhatsAppMode.LIVE, // client (optional, default: LIVE)
  undefined, // replyToMessageId (optional)
  'en_US' // language code (optional, default: 'en_US')
);
```

Common language codes: `en_US`, `en_GB`, `fr`, `es`, `ar`, `pt_BR`.

> Tip: create and manage templates with [`WhatsAppTemplatesService`](./advanced.md#whatsapptemplatesservice).

Signature:

```ts
sendTemplate(to, templateName, variables, clientName?, replyToMessageId?, languageCode?)
```

---

## Reactions

React to a message with an emoji:

```ts
await wa.sendReaction(
  '+15551234567',
  'wamid.HBgN...', // message ID to react to
  '👍',
  WhatsAppMode.LIVE
);
```

To remove a reaction, send an empty string `''` as the emoji.

Signature:

```ts
sendReaction(to, messageId, emoji, clientName?)
```

---

## Interactive Messages

Send button or list interactive messages:

```ts
import type { WhatsAppInteractivePayload } from 'nest-whatsapp';

const interactive: WhatsAppInteractivePayload = {
  type: 'button',
  body: { text: 'Choose an option:' },
  action: {
    buttons: [
      { type: 'reply', reply: { id: 'yes', title: 'Yes' } },
      { type: 'reply', reply: { id: 'no', title: 'No' } },
    ],
  },
};

await wa.sendInteractive('+15551234567', interactive, WhatsAppMode.LIVE);
```

Signature:

```ts
sendInteractive(to, interactive: WhatsAppInteractivePayload, clientName?, replyToMessageId?)
```

---

## Contact Cards

```ts
import type { WhatsAppContactCard } from 'nest-whatsapp';

const contacts: WhatsAppContactCard[] = [
  {
    name: { formatted_name: 'Alice Smith', first_name: 'Alice' },
    phones: [{ phone: '+15551112222', type: 'CELL' }],
    emails: [{ email: 'alice@example.com' }],
  },
];

await wa.sendContact('+15551234567', contacts, WhatsAppMode.LIVE);
```

Signature:

```ts
sendContact(to, contacts: WhatsAppContactCard[], clientName?, replyToMessageId?)
```

---

## Mark as Read

```ts
await wa.markAsRead('wamid.HBgN...', WhatsAppMode.LIVE);
```

Signature:

```ts
markAsRead(messageId, clientName?)
```

---

## Session Helpers

Convenience wrappers that send a standard `"Session started"` / `"Session ended"` text message:

```ts
await wa.startSession('+15551234567', WhatsAppMode.LIVE);
await wa.endSession('+15551234567', WhatsAppMode.LIVE);
```

---

## Reply Threading

All send methods accept an optional `replyToMessageId` as the last parameter. When provided, the
outbound message will quote/reference the original message in the chat UI.

```ts
// Reply to a received message
await wa.sendText('+15551234567', 'Thanks!', WhatsAppMode.LIVE, incomingMessageId);
await wa.sendMedia(
  '+15551234567',
  'https://...',
  'Here you go',
  WhatsAppMode.LIVE,
  incomingMessageId
);
```
