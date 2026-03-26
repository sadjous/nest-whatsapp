import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_MESSAGE_RECEIVED,
  WHATSAPP_STATUS_RECEIVED,
  WHATSAPP_TEXT_RECEIVED,
  WHATSAPP_IMAGE_RECEIVED,
  WHATSAPP_AUDIO_RECEIVED,
  WHATSAPP_DOCUMENT_RECEIVED,
  WHATSAPP_LOCATION_RECEIVED,
  WHATSAPP_TEMPLATE_RECEIVED,
  WHATSAPP_INTERACTIVE_RECEIVED,
  WHATSAPP_CONTACTS_RECEIVED,
  WHATSAPP_SYSTEM_RECEIVED,
  WHATSAPP_ORDER_RECEIVED,
  WHATSAPP_PRODUCT_RECEIVED,
  WHATSAPP_REACTION_RECEIVED,
  WHATSAPP_VIDEO_RECEIVED,
  WHATSAPP_STICKER_RECEIVED,
  WHATSAPP_REFERRAL_RECEIVED,
  type WhatsAppMessageReceivedEvent,
  type WhatsAppStatusEvent,
  type WhatsAppTypedMessageEvent,
  type WhatsAppReferralEvent,
  type WhatsAppEventMap,
} from '../interfaces/events';
import { WhatsAppMessageType } from '../interfaces/webhook.interfaces';

export interface WhatsAppEventEmitter {
  emit(event: string, payload: unknown): boolean;
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  onAny?(listener: (...args: unknown[]) => void): void;
  offAny?(listener: (...args: unknown[]) => void): void;
}

export const WHATSAPP_EVENT_EMITTER = Symbol('WHATSAPP_EVENT_EMITTER');

/** Internal typed emitter interface — single boundary cast, not exported. */
interface TypedEventEmitter<TMap> {
  emit<K extends keyof TMap>(event: K, payload: TMap[K]): boolean;
  on<K extends keyof TMap>(event: K, listener: (payload: TMap[K]) => void): void;
  off<K extends keyof TMap>(event: K, listener: (payload: TMap[K]) => void): void;
}

@Injectable()
export class WhatsAppEvents {
  private readonly typedEmitter: TypedEventEmitter<WhatsAppEventMap>;

  constructor(@Inject(WHATSAPP_EVENT_EMITTER) emitter: WhatsAppEventEmitter) {
    this.typedEmitter = emitter as unknown as TypedEventEmitter<WhatsAppEventMap>;
  }

  emitMessageReceived(payload: WhatsAppMessageReceivedEvent): boolean {
    return this.typedEmitter.emit(WHATSAPP_MESSAGE_RECEIVED, payload);
  }

  onMessageReceived(listener: (payload: WhatsAppMessageReceivedEvent) => void): void {
    this.typedEmitter.on(WHATSAPP_MESSAGE_RECEIVED, listener);
  }

  offMessageReceived(listener: (payload: WhatsAppMessageReceivedEvent) => void): void {
    this.typedEmitter.off(WHATSAPP_MESSAGE_RECEIVED, listener);
  }

  emitStatusReceived(payload: WhatsAppStatusEvent): boolean {
    return this.typedEmitter.emit(WHATSAPP_STATUS_RECEIVED, payload);
  }
  onStatusReceived(listener: (payload: WhatsAppStatusEvent) => void): void {
    this.typedEmitter.on(WHATSAPP_STATUS_RECEIVED, listener);
  }
  offStatusReceived(listener: (payload: WhatsAppStatusEvent) => void): void {
    this.typedEmitter.off(WHATSAPP_STATUS_RECEIVED, listener);
  }

  emitTextReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEXT>): boolean {
    return this.typedEmitter.emit(WHATSAPP_TEXT_RECEIVED, payload);
  }
  onTextReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEXT>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_TEXT_RECEIVED, listener);
  }
  offTextReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEXT>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_TEXT_RECEIVED, listener);
  }

  emitImageReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.IMAGE>): boolean {
    return this.typedEmitter.emit(WHATSAPP_IMAGE_RECEIVED, payload);
  }
  onImageReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.IMAGE>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_IMAGE_RECEIVED, listener);
  }
  offImageReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.IMAGE>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_IMAGE_RECEIVED, listener);
  }

  emitAudioReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.AUDIO>): boolean {
    return this.typedEmitter.emit(WHATSAPP_AUDIO_RECEIVED, payload);
  }
  onAudioReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.AUDIO>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_AUDIO_RECEIVED, listener);
  }
  offAudioReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.AUDIO>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_AUDIO_RECEIVED, listener);
  }

  emitDocumentReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.DOCUMENT>): boolean {
    return this.typedEmitter.emit(WHATSAPP_DOCUMENT_RECEIVED, payload);
  }
  onDocumentReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.DOCUMENT>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_DOCUMENT_RECEIVED, listener);
  }
  offDocumentReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.DOCUMENT>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_DOCUMENT_RECEIVED, listener);
  }

  emitLocationReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.LOCATION>): boolean {
    return this.typedEmitter.emit(WHATSAPP_LOCATION_RECEIVED, payload);
  }
  onLocationReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.LOCATION>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_LOCATION_RECEIVED, listener);
  }
  offLocationReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.LOCATION>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_LOCATION_RECEIVED, listener);
  }

  emitTemplateReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEMPLATE>): boolean {
    return this.typedEmitter.emit(WHATSAPP_TEMPLATE_RECEIVED, payload);
  }
  onTemplateReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEMPLATE>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_TEMPLATE_RECEIVED, listener);
  }
  offTemplateReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEMPLATE>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_TEMPLATE_RECEIVED, listener);
  }

  emitInteractiveReceived(
    payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.INTERACTIVE>
  ): boolean {
    return this.typedEmitter.emit(WHATSAPP_INTERACTIVE_RECEIVED, payload);
  }
  onInteractiveReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.INTERACTIVE>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_INTERACTIVE_RECEIVED, listener);
  }
  offInteractiveReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.INTERACTIVE>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_INTERACTIVE_RECEIVED, listener);
  }

  emitContactsReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.CONTACTS>): boolean {
    return this.typedEmitter.emit(WHATSAPP_CONTACTS_RECEIVED, payload);
  }
  onContactsReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.CONTACTS>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_CONTACTS_RECEIVED, listener);
  }
  offContactsReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.CONTACTS>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_CONTACTS_RECEIVED, listener);
  }

  emitSystemReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.SYSTEM>): boolean {
    return this.typedEmitter.emit(WHATSAPP_SYSTEM_RECEIVED, payload);
  }
  onSystemReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.SYSTEM>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_SYSTEM_RECEIVED, listener);
  }
  offSystemReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.SYSTEM>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_SYSTEM_RECEIVED, listener);
  }

  emitOrderReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.ORDER>): boolean {
    return this.typedEmitter.emit(WHATSAPP_ORDER_RECEIVED, payload);
  }
  onOrderReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.ORDER>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_ORDER_RECEIVED, listener);
  }
  offOrderReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.ORDER>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_ORDER_RECEIVED, listener);
  }

  emitProductReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.PRODUCT>): boolean {
    return this.typedEmitter.emit(WHATSAPP_PRODUCT_RECEIVED, payload);
  }
  onProductReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.PRODUCT>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_PRODUCT_RECEIVED, listener);
  }
  offProductReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.PRODUCT>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_PRODUCT_RECEIVED, listener);
  }

  emitReactionReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.REACTION>): boolean {
    return this.typedEmitter.emit(WHATSAPP_REACTION_RECEIVED, payload);
  }
  onReactionReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.REACTION>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_REACTION_RECEIVED, listener);
  }
  offReactionReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.REACTION>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_REACTION_RECEIVED, listener);
  }

  emitVideoReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.VIDEO>): boolean {
    return this.typedEmitter.emit(WHATSAPP_VIDEO_RECEIVED, payload);
  }
  onVideoReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.VIDEO>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_VIDEO_RECEIVED, listener);
  }
  offVideoReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.VIDEO>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_VIDEO_RECEIVED, listener);
  }

  emitStickerReceived(payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.STICKER>): boolean {
    return this.typedEmitter.emit(WHATSAPP_STICKER_RECEIVED, payload);
  }
  onStickerReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.STICKER>) => void
  ): void {
    this.typedEmitter.on(WHATSAPP_STICKER_RECEIVED, listener);
  }
  offStickerReceived(
    listener: (payload: WhatsAppTypedMessageEvent<WhatsAppMessageType.STICKER>) => void
  ): void {
    this.typedEmitter.off(WHATSAPP_STICKER_RECEIVED, listener);
  }

  emitReferralReceived(payload: WhatsAppReferralEvent): boolean {
    return this.typedEmitter.emit(WHATSAPP_REFERRAL_RECEIVED, payload);
  }
  onReferralReceived(listener: (payload: WhatsAppReferralEvent) => void): void {
    this.typedEmitter.on(WHATSAPP_REFERRAL_RECEIVED, listener);
  }
  offReferralReceived(listener: (payload: WhatsAppReferralEvent) => void): void {
    this.typedEmitter.off(WHATSAPP_REFERRAL_RECEIVED, listener);
  }
}
