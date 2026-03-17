import type {
  WhatsAppWebhookPayload,
  WhatsAppWebhookEntry,
  WhatsAppWebhookChange,
  WhatsAppWebhookChangeValue,
  WhatsAppMessage,
  WhatsAppContact,
} from '../interfaces/webhook.interfaces';

/** Returns the first entry from the webhook payload, if present. */
export function getFirstEntry(payload: WhatsAppWebhookPayload): WhatsAppWebhookEntry | undefined {
  return payload.entry?.[0];
}

/** Returns the first change from the webhook payload, if present. */
export function getFirstChange(payload: WhatsAppWebhookPayload): WhatsAppWebhookChange | undefined {
  return getFirstEntry(payload)?.changes?.[0];
}

/** Returns the first change value from the webhook payload, if present. */
export function getValue(payload: WhatsAppWebhookPayload): WhatsAppWebhookChangeValue | undefined {
  return getFirstChange(payload)?.value;
}

/** Returns the first message from the webhook payload, if present. */
export function getFirstMessage(payload: WhatsAppWebhookPayload): WhatsAppMessage | undefined {
  return getValue(payload)?.messages?.[0];
}

/** Returns all entries; handy when processing batches. */
export function getAllEntries(payload: WhatsAppWebhookPayload): WhatsAppWebhookEntry[] {
  return payload.entry ?? [];
}

/** Returns all changes across all entries. */
export function getAllChanges(payload: WhatsAppWebhookPayload): WhatsAppWebhookChange[] {
  return getAllEntries(payload).flatMap((e) => e.changes ?? []);
}

/** Returns all change values across the entire payload. */
export function getAllValues(payload: WhatsAppWebhookPayload): WhatsAppWebhookChangeValue[] {
  return getAllChanges(payload)
    .map((c) => c.value)
    .filter((v): v is WhatsAppWebhookChangeValue => v != null);
}

/** Returns all messages across entries/changes in order. */
export function getAllMessages(payload: WhatsAppWebhookPayload): WhatsAppMessage[] {
  return getAllValues(payload).flatMap((v) => v.messages ?? []);
}

/** Returns all statuses across entries/changes in order. */
export function getAllStatuses(
  payload: WhatsAppWebhookPayload
): NonNullable<WhatsAppWebhookChangeValue['statuses']>[number][] {
  return getAllValues(payload).flatMap((v) => v.statuses ?? []);
}

export function getFirstContact(payload: WhatsAppWebhookPayload): WhatsAppContact | undefined {
  return getValue(payload)?.contacts?.[0];
}

export function isTextMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'text' }> {
  return !!msg && msg.type === 'text';
}
export function isImageMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'image' }> {
  return !!msg && msg.type === 'image';
}
export function isAudioMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'audio' }> {
  return !!msg && msg.type === 'audio';
}
export function isDocumentMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'document' }> {
  return !!msg && msg.type === 'document';
}
export function isLocationMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'location' }> {
  return !!msg && msg.type === 'location';
}
export function isTemplateMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'template' }> {
  return !!msg && msg.type === 'template';
}
export function isInteractiveMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'interactive' }> {
  return !!msg && msg.type === 'interactive';
}
export function isVideoMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'video' }> {
  return !!msg && msg.type === 'video';
}
export function isStickerMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'sticker' }> {
  return !!msg && msg.type === 'sticker';
}
export function isContactsMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'contacts' }> {
  return !!msg && msg.type === 'contacts';
}
export function isSystemMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'system' }> {
  return !!msg && msg.type === 'system';
}
export function isOrderMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'order' }> {
  return !!msg && msg.type === 'order';
}
export function isProductMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'product' }> {
  return !!msg && msg.type === 'product';
}
export function isReactionMessage(
  msg: WhatsAppMessage | undefined
): msg is Extract<WhatsAppMessage, { type: 'reaction' }> {
  return !!msg && msg.type === 'reaction';
}
