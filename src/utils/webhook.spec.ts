import {
  getFirstEntry,
  getFirstChange,
  getValue,
  getFirstMessage,
  getAllEntries,
  getAllChanges,
  getAllValues,
  getAllMessages,
  getAllStatuses,
} from './webhook';
import type {
  WhatsAppWebhookPayload,
  WhatsAppWebhookChangeValue,
  WhatsAppMessage,
} from '../interfaces/webhook.interfaces';
import { unsafeCast } from '../test-utils/type-helpers';

describe('webhook utils', () => {
  const empty: WhatsAppWebhookPayload = { object: 'whatsapp_business_account', entry: [] };

  it('handles empty payload', () => {
    expect(getFirstEntry(empty)).toBeUndefined();
    expect(getFirstChange(empty)).toBeUndefined();
    expect(getValue(empty)).toBeUndefined();
    expect(getFirstMessage(empty)).toBeUndefined();
    expect(getAllEntries(empty)).toEqual([]);
    expect(getAllChanges(empty)).toEqual([]);
    expect(getAllValues(empty)).toEqual([]);
    expect(getAllMessages(empty)).toEqual([]);
    expect(getAllStatuses(empty)).toEqual([]);
  });

  it('handles missing entry and undefined changes/messages', () => {
    // Missing entry property entirely
    const noEntry = unsafeCast<WhatsAppWebhookPayload>({ object: 'whatsapp_business_account' });
    expect(getAllEntries(noEntry)).toEqual([]);
    expect(getAllChanges(noEntry)).toEqual([]);
    expect(getAllValues(noEntry)).toEqual([]);
    expect(getAllMessages(noEntry)).toEqual([]);

    // Entry with undefined changes
    const withUndefinedChanges = unsafeCast<WhatsAppWebhookPayload>({
      object: 'x',
      entry: [{ id: 'e', changes: undefined }],
    });
    expect(getAllChanges(withUndefinedChanges)).toEqual([]);

    // Change without messages (only statuses)
    const valueOnlyStatuses: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      statuses: [{ id: '1', status: 'read' }],
    };
    const onlyStatuses: WhatsAppWebhookPayload = {
      object: 'x',
      entry: [{ id: 'e', changes: [{ field: 'messages', value: valueOnlyStatuses }] }],
    } as WhatsAppWebhookPayload;
    expect(getAllMessages(onlyStatuses)).toEqual([]);
    expect(getAllStatuses(onlyStatuses).length).toBe(1);
  });

  it('extracts elements from payload', () => {
    const msg1: WhatsAppMessage = { type: 'text', text: { body: 'a' } } as WhatsAppMessage;
    const msg2: WhatsAppMessage = { type: 'image', image: { link: 'u' } } as WhatsAppMessage;
    const value1: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      messages: [msg1],
      statuses: [{ id: '1', status: 'sent' }],
    };
    const value2: WhatsAppWebhookChangeValue = { messaging_product: 'whatsapp', messages: [msg2] };
    const payload: WhatsAppWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        { id: 'e1', changes: [{ field: 'messages', value: value1 }] },
        { id: 'e2', changes: [{ field: 'messages', value: value2 }] },
      ],
    };
    expect(getFirstEntry(payload)?.id).toBe('e1');
    expect(getFirstChange(payload)?.field).toBe('messages');
    expect(getValue(payload)?.messages?.length).toBe(1);
    expect(getFirstMessage(payload)).toBe(msg1);
    expect(getAllEntries(payload).length).toBe(2);
    expect(getAllChanges(payload).length).toBe(2);
    expect(getAllValues(payload).length).toBe(2);
    expect(getAllMessages(payload)).toEqual([msg1, msg2]);
    expect(getAllStatuses(payload).length).toBe(1);
  });
});
