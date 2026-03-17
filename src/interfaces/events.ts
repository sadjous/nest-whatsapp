import type {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppStatus,
  WhatsAppContact,
  WhatsAppMetadata,
} from './webhook.interfaces';

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

export type WhatsAppMessageReceivedEvent = WhatsAppWebhookPayload;

export interface BaseMessageEvent {
  contact?: WhatsAppContact;
  metadata?: WhatsAppMetadata;
}

export interface WhatsAppStatusEvent extends BaseMessageEvent {
  status: WhatsAppStatus;
}

export interface WhatsAppTypedMessageEvent<T extends WhatsAppMessage['type']>
  extends BaseMessageEvent {
  message: Extract<WhatsAppMessage, { type: T }>;
}

export type WhatsAppEventMap = {
  [WHATSAPP_MESSAGE_RECEIVED]: WhatsAppMessageReceivedEvent;
  [WHATSAPP_STATUS_RECEIVED]: WhatsAppStatusEvent;
  [WHATSAPP_TEXT_RECEIVED]: WhatsAppTypedMessageEvent<'text'>;
  [WHATSAPP_IMAGE_RECEIVED]: WhatsAppTypedMessageEvent<'image'>;
  [WHATSAPP_AUDIO_RECEIVED]: WhatsAppTypedMessageEvent<'audio'>;
  [WHATSAPP_DOCUMENT_RECEIVED]: WhatsAppTypedMessageEvent<'document'>;
  [WHATSAPP_LOCATION_RECEIVED]: WhatsAppTypedMessageEvent<'location'>;
  [WHATSAPP_TEMPLATE_RECEIVED]: WhatsAppTypedMessageEvent<'template'>;
  [WHATSAPP_INTERACTIVE_RECEIVED]: WhatsAppTypedMessageEvent<'interactive'>;
  [WHATSAPP_CONTACTS_RECEIVED]: WhatsAppTypedMessageEvent<'contacts'>;
  [WHATSAPP_SYSTEM_RECEIVED]: WhatsAppTypedMessageEvent<'system'>;
  [WHATSAPP_ORDER_RECEIVED]: WhatsAppTypedMessageEvent<'order'>;
  [WHATSAPP_PRODUCT_RECEIVED]: WhatsAppTypedMessageEvent<'product'>;
  [WHATSAPP_REACTION_RECEIVED]: WhatsAppTypedMessageEvent<'reaction'>;
};

// Normalized sub-events
export type WhatsAppEventName = keyof WhatsAppEventMap;
