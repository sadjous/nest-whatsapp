import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WhatsAppEvents } from './whatsapp.events';
import { type WhatsAppStatusEvent, type WhatsAppTypedMessageEvent } from '../interfaces/events';
import type { WhatsAppWebhookPayload } from '../interfaces/webhook.interfaces';
import {
  getAllValues,
  isTextMessage,
  isImageMessage,
  isAudioMessage,
  isDocumentMessage,
  isLocationMessage,
  isTemplateMessage,
  isInteractiveMessage,
  isContactsMessage,
  isSystemMessage,
  isOrderMessage,
  isProductMessage,
  isVideoMessage,
  isStickerMessage,
  isReactionMessage,
} from '../utils/webhook';

@Injectable()
export class WhatsAppWebhookProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly boundProcessPayload = (payload: WhatsAppWebhookPayload): void =>
    this.processPayload(payload);

  constructor(private readonly events: WhatsAppEvents) {}

  onModuleInit(): void {
    // Subscribe to raw webhook payloads and emit normalized typed sub-events
    this.events.onMessageReceived(this.boundProcessPayload);
  }

  onModuleDestroy(): void {
    this.events.offMessageReceived(this.boundProcessPayload);
  }

  private processPayload(payload: WhatsAppWebhookPayload): void {
    for (const value of getAllValues(payload)) {
      const contact = value.contacts?.[0];
      const metadata = value.metadata;

      for (const status of value.statuses ?? []) {
        const statusEvent: WhatsAppStatusEvent = { status, contact, metadata };
        this.events.emitStatusReceived(statusEvent);
      }

      for (const msg of value.messages ?? []) {
        if (isTextMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'text'> = { message: msg, contact, metadata };
          this.events.emitTextReceived(ev);
        } else if (isImageMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'image'> = { message: msg, contact, metadata };
          this.events.emitImageReceived(ev);
        } else if (isAudioMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'audio'> = { message: msg, contact, metadata };
          this.events.emitAudioReceived(ev);
        } else if (isDocumentMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'document'> = { message: msg, contact, metadata };
          this.events.emitDocumentReceived(ev);
        } else if (isLocationMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'location'> = { message: msg, contact, metadata };
          this.events.emitLocationReceived(ev);
        } else if (isTemplateMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'template'> = { message: msg, contact, metadata };
          this.events.emitTemplateReceived(ev);
        } else if (isInteractiveMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'interactive'> = { message: msg, contact, metadata };
          this.events.emitInteractiveReceived(ev);
        } else if (isContactsMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'contacts'> = { message: msg, contact, metadata };
          this.events.emitContactsReceived(ev);
        } else if (isSystemMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'system'> = { message: msg, contact, metadata };
          this.events.emitSystemReceived(ev);
        } else if (isOrderMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'order'> = { message: msg, contact, metadata };
          this.events.emitOrderReceived(ev);
        } else if (isProductMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'product'> = { message: msg, contact, metadata };
          this.events.emitProductReceived(ev);
        } else if (isVideoMessage(msg)) {
          void msg; // no-op: path acknowledged
        } else if (isStickerMessage(msg)) {
          void msg; // no-op: path acknowledged
        } else if (isReactionMessage(msg)) {
          const ev: WhatsAppTypedMessageEvent<'reaction'> = { message: msg, contact, metadata };
          this.events.emitReactionReceived(ev);
        }
      }
    }
  }
}
