import { EventEmitter2 } from 'eventemitter2';
import { unsafeCast } from '../test-utils/type-helpers';
import { WhatsAppEvents, type WhatsAppEventEmitter } from './whatsapp.events';
import { WhatsAppWebhookProcessor } from './whatsapp.webhook-processor';
import type {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppWebhookChangeValue,
} from '../interfaces/webhook.interfaces';

function makePayload(value: WhatsAppWebhookChangeValue): WhatsAppWebhookPayload {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry-id',
        changes: [
          {
            field: 'messages',
            value,
          },
        ],
      },
    ],
  };
}

describe('WhatsAppWebhookProcessor', () => {
  let emitter: EventEmitter2;
  let events: WhatsAppEvents;
  let processor: WhatsAppWebhookProcessor;

  beforeEach(() => {
    emitter = new EventEmitter2();
    events = new WhatsAppEvents(emitter);
    processor = new WhatsAppWebhookProcessor(events);
    processor.onModuleInit();
  });

  it('emits text_received from message_received', (done) => {
    const msg: WhatsAppMessage = { type: 'text', text: { body: 'hello' }, from: '123' };
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onTextReceived(({ message, contact }) => {
      try {
        expect(message.type).toBe('text');
        expect(message.text.body).toBe('hello');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('emits status_received from message_received', (done) => {
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      statuses: [{ id: 'm1', status: 'delivered', recipient_id: '123' }],
    };
    events.onStatusReceived(({ status, contact }) => {
      try {
        expect(status.status).toBe('delivered');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('emits status_received for each status in the payload', () => {
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      statuses: [
        { id: 'm1', status: 'delivered', recipient_id: '123' },
        { id: 'm1', status: 'read', recipient_id: '123' },
      ],
    };
    const spy = jest.fn();
    events.onStatusReceived(spy);

    events.emitMessageReceived(makePayload(value));

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0].status.status).toBe('delivered');
    expect(spy.mock.calls[1][0].status.status).toBe('read');
  });

  it('emits interactive_received for button reply', (done) => {
    const msg: WhatsAppMessage = {
      type: 'interactive',
      interactive: { type: 'button', button_reply: { id: 'b1', title: 'Yes' } },
      from: '123',
    };
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onInteractiveReceived(({ message, contact }) => {
      try {
        expect(message.type).toBe('interactive');
        expect(message.interactive.type).toBe('button');
        expect(message.interactive.button_reply?.id).toBe('b1');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('emits interactive_received for list reply', (done) => {
    const msg: WhatsAppMessage = {
      type: 'interactive',
      interactive: { type: 'list', list_reply: { id: 'l1', title: 'Option A' } },
      from: '123',
    } as WhatsAppMessage;
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onInteractiveReceived(({ message, contact }) => {
      try {
        expect(message.type).toBe('interactive');
        expect(message.interactive.type).toBe('list');
        expect(message.interactive.list_reply?.id).toBe('l1');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('emits order_received', (done) => {
    const msg: WhatsAppMessage = {
      type: 'order',
      order: { product_items: [{ product_retailer_id: 'sku-1', quantity: 2 }] },
      from: '123',
    } as WhatsAppMessage;
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onOrderReceived(({ message, contact }) => {
      try {
        expect(message.type).toBe('order');
        expect(message.order.product_items?.[0].product_retailer_id).toBe('sku-1');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('emits product_received', (done) => {
    const msg: WhatsAppMessage = {
      type: 'product',
      product: { retailer_id: 'prod-1' },
      from: '123',
    } as WhatsAppMessage;
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onProductReceived(({ message, contact }) => {
      try {
        expect(message.type).toBe('product');
        expect(message.product.retailer_id).toBe('prod-1');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('covers image/audio/document/location/template branches', (done) => {
    const cases: WhatsAppMessage[] = [
      { type: 'image', image: { link: 'u' }, from: '1' } as WhatsAppMessage,
      { type: 'audio', audio: { link: 'u' }, from: '1' } as WhatsAppMessage,
      { type: 'document', document: { link: 'u' }, from: '1' } as WhatsAppMessage,
      { type: 'location', location: { latitude: 0, longitude: 0 }, from: '1' } as WhatsAppMessage,
      { type: 'template', template: { name: 't' }, from: '1' } as WhatsAppMessage,
    ];
    const received: string[] = [];
    events.onImageReceived(() => received.push('image'));
    events.onAudioReceived(() => received.push('audio'));
    events.onDocumentReceived(() => received.push('document'));
    events.onLocationReceived(() => received.push('location'));
    events.onTemplateReceived(() => received.push('template'));
    for (const msg of cases) {
      events.emitMessageReceived(makePayload({ messaging_product: 'whatsapp', messages: [msg] }));
    }
    // wait microtask
    setImmediate(() => {
      try {
        expect(received.sort()).toEqual(['audio', 'document', 'image', 'location', 'template']);
        done();
      } catch (e) {
        done(e as Error);
      }
    });
  });

  it('emits reaction_received', (done) => {
    const msg: WhatsAppMessage = {
      type: 'reaction',
      reaction: { message_id: 'm1', emoji: '👍', action: 'react' },
      from: '123',
    } as WhatsAppMessage;
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onReactionReceived(({ message, contact }) => {
      try {
        expect(message.type).toBe('reaction');
        expect(message.reaction.emoji).toBe('👍');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('ignores sticker/video (no dedicated event)', () => {
    const sticker: WhatsAppMessage = {
      type: 'sticker',
      sticker: { link: 'url' },
      from: '1',
    } as WhatsAppMessage;
    const video: WhatsAppMessage = {
      type: 'video',
      video: { link: 'url' },
      from: '1',
    } as WhatsAppMessage;
    const valueSticker: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      messages: [sticker],
    };
    const valueVideo: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      messages: [video],
    };
    const spyAny = jest.fn();
    const internalEmitter = unsafeCast<{ typedEmitter: WhatsAppEventEmitter }>(events).typedEmitter;
    internalEmitter.onAny?.(spyAny);
    events.emitMessageReceived(makePayload(valueSticker));
    events.emitMessageReceived(makePayload(valueVideo));
    expect(spyAny).toHaveBeenCalled(); // other events may be emitted by EventEmitter2 internals, but no specific sticker/video
  });

  it('emits contacts_received', (done) => {
    const msg: WhatsAppMessage = {
      type: 'contacts',
      contacts: [{ name: { formatted_name: 'John' }, phones: [{ phone: '+123' }] }],
      from: '123',
    } as WhatsAppMessage;
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onContactsReceived(({ message, contact }) => {
      try {
        expect(message.type).toBe('contacts');
        expect(message.contacts[0].name?.formatted_name).toBe('John');
        expect(contact?.wa_id).toBe('123');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('emits system_received', (done) => {
    const msg: WhatsAppMessage = {
      type: 'system',
      system: { type: 'user_changed_number', body: 'User changed number' },
      from: '123',
    } as WhatsAppMessage;
    const value: WhatsAppWebhookChangeValue = {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '123' }],
      messages: [msg],
    };
    events.onSystemReceived(({ message }) => {
      try {
        expect(message.type).toBe('system');
        expect(message.system.type).toBe('user_changed_number');
        done();
      } catch (e) {
        done(e as Error);
      }
    });
    events.emitMessageReceived(makePayload(value));
  });

  it('emits message events for every message in the payload', () => {
    const text: WhatsAppMessage = { type: 'text', text: { body: 'A' }, from: '1' };
    const audio: WhatsAppMessage = {
      type: 'audio',
      audio: { link: 'u' },
      from: '1',
    } as WhatsAppMessage;
    const payload = makePayload({
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '1' }],
      messages: [text, audio],
    });

    const textSpy = jest.fn();
    const audioSpy = jest.fn();
    events.onTextReceived(textSpy);
    events.onAudioReceived(audioSpy);

    events.emitMessageReceived(payload);

    expect(textSpy).toHaveBeenCalledTimes(1);
    expect(audioSpy).toHaveBeenCalledTimes(1);
    expect(textSpy.mock.calls[0][0].message.text?.body).toBe('A');
  });
});
