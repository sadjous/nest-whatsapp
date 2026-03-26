import type {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppStatus,
  WhatsAppContact,
  WhatsAppMetadata,
  WhatsAppReferral,
} from './webhook.interfaces';
import { WhatsAppMessageType } from './webhook.interfaces';

export const WHATSAPP_MESSAGE_RECEIVED = 'whatsapp.message_received' as const;
export const WHATSAPP_STATUS_RECEIVED = 'whatsapp.status_received' as const;
export const WHATSAPP_TEXT_RECEIVED = 'whatsapp.text_received' as const;
export const WHATSAPP_IMAGE_RECEIVED = 'whatsapp.image_received' as const;
export const WHATSAPP_AUDIO_RECEIVED = 'whatsapp.audio_received' as const;
export const WHATSAPP_DOCUMENT_RECEIVED = 'whatsapp.document_received' as const;
export const WHATSAPP_LOCATION_RECEIVED = 'whatsapp.location_received' as const;
export const WHATSAPP_TEMPLATE_RECEIVED = 'whatsapp.template_received' as const;
export const WHATSAPP_INTERACTIVE_RECEIVED = 'whatsapp.interactive_received' as const;
export const WHATSAPP_CONTACTS_RECEIVED = 'whatsapp.contacts_received' as const;
export const WHATSAPP_SYSTEM_RECEIVED = 'whatsapp.system_received' as const;
export const WHATSAPP_ORDER_RECEIVED = 'whatsapp.order_received' as const;
export const WHATSAPP_PRODUCT_RECEIVED = 'whatsapp.product_received' as const;
export const WHATSAPP_REACTION_RECEIVED = 'whatsapp.reaction_received' as const;
export const WHATSAPP_VIDEO_RECEIVED = 'whatsapp.video_received' as const;
export const WHATSAPP_STICKER_RECEIVED = 'whatsapp.sticker_received' as const;
export const WHATSAPP_REFERRAL_RECEIVED = 'whatsapp.referral_received' as const;

export type WhatsAppMessageReceivedEvent = WhatsAppWebhookPayload;

export interface BaseMessageEvent {
  contact?: WhatsAppContact;
  metadata?: WhatsAppMetadata;
}

export interface WhatsAppStatusEvent extends BaseMessageEvent {
  status: WhatsAppStatus;
}

export interface WhatsAppTypedMessageEvent<
  T extends WhatsAppMessage['type'],
> extends BaseMessageEvent {
  message: Extract<WhatsAppMessage, { type: T }>;
}

/** Emitted when an inbound message originated from a Click-to-WhatsApp ad. */
export interface WhatsAppReferralEvent extends BaseMessageEvent {
  message: WhatsAppMessage;
  referral: WhatsAppReferral;
}

export type WhatsAppEventMap = {
  [WHATSAPP_MESSAGE_RECEIVED]: WhatsAppMessageReceivedEvent;
  [WHATSAPP_STATUS_RECEIVED]: WhatsAppStatusEvent;
  [WHATSAPP_TEXT_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEXT>;
  [WHATSAPP_IMAGE_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.IMAGE>;
  [WHATSAPP_AUDIO_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.AUDIO>;
  [WHATSAPP_DOCUMENT_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.DOCUMENT>;
  [WHATSAPP_LOCATION_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.LOCATION>;
  [WHATSAPP_TEMPLATE_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.TEMPLATE>;
  [WHATSAPP_INTERACTIVE_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.INTERACTIVE>;
  [WHATSAPP_CONTACTS_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.CONTACTS>;
  [WHATSAPP_SYSTEM_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.SYSTEM>;
  [WHATSAPP_ORDER_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.ORDER>;
  [WHATSAPP_PRODUCT_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.PRODUCT>;
  [WHATSAPP_REACTION_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.REACTION>;
  [WHATSAPP_VIDEO_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.VIDEO>;
  [WHATSAPP_STICKER_RECEIVED]: WhatsAppTypedMessageEvent<WhatsAppMessageType.STICKER>;
  [WHATSAPP_REFERRAL_RECEIVED]: WhatsAppReferralEvent;
};

// Normalized sub-events
export type WhatsAppEventName = keyof WhatsAppEventMap;
