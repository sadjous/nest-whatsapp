export type HubMode = 'subscribe' | string;

export interface VerifyWebhookQuery {
  'hub.mode'?: HubMode;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

// WhatsApp Cloud API webhook payload (subset)
export interface WhatsAppProfile {
  name?: string;
}
export interface WhatsAppContact {
  wa_id: string;
  profile?: WhatsAppProfile;
}

export interface WhatsAppContext {
  message_id: string;
}
export interface WhatsAppText {
  body: string;
}
export interface WhatsAppImage {
  link: string;
  caption?: string;
}
export interface WhatsAppAudio {
  link: string;
}
export interface WhatsAppDocument {
  link: string;
  filename?: string;
}
export interface WhatsAppLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}
export interface WhatsAppVideo {
  link: string;
  caption?: string;
}
export interface WhatsAppSticker {
  link: string;
}
export interface WhatsAppInteractiveButtonReply {
  id: string;
  title: string;
}
export interface WhatsAppInteractiveListReply {
  id: string;
  title: string;
  description?: string;
}
export interface WhatsAppInteractive {
  type: 'button' | 'list';
  button_reply?: WhatsAppInteractiveButtonReply;
  list_reply?: WhatsAppInteractiveListReply;
}
export interface WhatsAppContactPhone {
  phone: string;
  type?: string;
  wa_id?: string;
}
export interface WhatsAppContactName {
  formatted_name?: string;
  first_name?: string;
  last_name?: string;
}
export interface WhatsAppContactCard {
  name?: WhatsAppContactName;
  phones?: WhatsAppContactPhone[];
}
export interface WhatsAppSystemPayload {
  type?: string;
  body?: string;
}
export interface WhatsAppOrderItem {
  product_retailer_id: string;
  quantity: number;
  item_price?: string;
  currency?: string;
}
export interface WhatsAppOrder {
  catalog_id?: string;
  product_items?: WhatsAppOrderItem[];
}
export interface WhatsAppProduct {
  retailer_id: string;
}
export interface WhatsAppReaction {
  message_id: string;
  emoji?: string;
  action?: 'react' | 'unreact';
}

export type WhatsAppMessageBase = {
  id?: string;
  from?: string;
  timestamp?: string;
  context?: WhatsAppContext;
};

export type WhatsAppMessage =
  | (WhatsAppMessageBase & { type: 'text'; text: WhatsAppText })
  | (WhatsAppMessageBase & { type: 'image'; image: WhatsAppImage })
  | (WhatsAppMessageBase & { type: 'audio'; audio: WhatsAppAudio })
  | (WhatsAppMessageBase & { type: 'document'; document: WhatsAppDocument })
  | (WhatsAppMessageBase & { type: 'location'; location: WhatsAppLocation })
  | (WhatsAppMessageBase & { type: 'video'; video: WhatsAppVideo })
  | (WhatsAppMessageBase & { type: 'sticker'; sticker: WhatsAppSticker })
  | (WhatsAppMessageBase & {
      type: 'template';
      template: { name: string; language?: { code: string } };
    })
  | (WhatsAppMessageBase & { type: 'interactive'; interactive: WhatsAppInteractive })
  | (WhatsAppMessageBase & { type: 'contacts'; contacts: WhatsAppContactCard[] })
  | (WhatsAppMessageBase & { type: 'system'; system: WhatsAppSystemPayload })
  | (WhatsAppMessageBase & { type: 'order'; order: WhatsAppOrder })
  | (WhatsAppMessageBase & { type: 'product'; product: WhatsAppProduct })
  | (WhatsAppMessageBase & { type: 'reaction'; reaction: WhatsAppReaction });

export interface WhatsAppMetadata {
  phone_number_id?: string;
  display_phone_number?: string;
}

export interface WhatsAppStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
}

export interface WhatsAppWebhookChangeValue {
  messaging_product: 'whatsapp';
  metadata?: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppWebhookChange {
  field: string;
  value: WhatsAppWebhookChangeValue;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export interface RawBodyRequestLike<TBody, TQuery> {
  rawBody: Buffer;
  body: TBody;
  query: TQuery;
}

export type WhatsAppOutboundPayload = {
  messaging_product: 'whatsapp';
  to: string;
  type: string;
  context?: { message_id: string };
  [key: string]: unknown;
};

export interface WhatsAppOutboundButton {
  type: 'reply';
  reply: { id: string; title: string };
}
export interface WhatsAppOutboundSection {
  title?: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}
export interface WhatsAppOutboundInteractive {
  type: 'button' | 'list';
  header?: { type: 'text'; text: string };
  body: { text: string };
  footer?: { text: string };
  action:
    | { buttons: WhatsAppOutboundButton[] }
    | { button: string; sections: WhatsAppOutboundSection[] };
}
