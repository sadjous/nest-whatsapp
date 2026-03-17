import { EventEmitter2 } from 'eventemitter2';
import { WhatsAppEvents } from './whatsapp.events';
import type {
  WhatsAppTypedMessageEvent,
  WhatsAppStatusEvent,
  WhatsAppMessageReceivedEvent,
} from '../interfaces/events';
import type { WhatsAppMessage } from '../interfaces/webhook.interfaces';

describe('WhatsAppEvents facade', () => {
  let emitter: EventEmitter2;
  let events: WhatsAppEvents;

  beforeEach(() => {
    emitter = new EventEmitter2();
    events = new WhatsAppEvents(emitter);
  });

  it('message received on/off', () => {
    const payload: WhatsAppMessageReceivedEvent = { object: 'x', entry: [] };
    const spy = jest.fn();
    events.onMessageReceived(spy);
    events.emitMessageReceived(payload);
    expect(spy).toHaveBeenCalledWith(payload);
    events.offMessageReceived(spy);
    events.emitMessageReceived(payload);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('status received on/off', () => {
    const payload: WhatsAppStatusEvent = {
      status: { id: '1', status: 'read' },
      contact: { wa_id: 'w' },
    };
    const spy = jest.fn();
    events.onStatusReceived(spy);
    events.emitStatusReceived(payload);
    expect(spy).toHaveBeenCalledWith(payload);
    events.offStatusReceived(spy);
    events.emitStatusReceived(payload);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('typed message events on/emit/off', () => {
    function runCase<T extends WhatsAppMessage['type']>(c: {
      on: (fn: (p: WhatsAppTypedMessageEvent<T>) => void) => void;
      off: (fn: (p: WhatsAppTypedMessageEvent<T>) => void) => void;
      emit: (p: WhatsAppTypedMessageEvent<T>) => boolean;
      payload: WhatsAppTypedMessageEvent<T>;
    }): void {
      const spy = jest.fn((p: WhatsAppTypedMessageEvent<T>) => void p);
      c.on(spy);
      c.emit(c.payload);
      expect(spy).toHaveBeenCalledWith(c.payload);
      c.off(spy);
      c.emit(c.payload);
      expect(spy).toHaveBeenCalledTimes(1);
    }

    runCase({
      on: events.onTextReceived.bind(events),
      off: events.offTextReceived.bind(events),
      emit: events.emitTextReceived.bind(events),
      payload: { message: { type: 'text', text: { body: 'a' } }, contact: { wa_id: '1' } },
    });
    runCase({
      on: events.onImageReceived.bind(events),
      off: events.offImageReceived.bind(events),
      emit: events.emitImageReceived.bind(events),
      payload: { message: { type: 'image', image: { link: 'u' } }, contact: { wa_id: '1' } },
    });
    runCase({
      on: events.onAudioReceived.bind(events),
      off: events.offAudioReceived.bind(events),
      emit: events.emitAudioReceived.bind(events),
      payload: { message: { type: 'audio', audio: { link: 'u' } }, contact: { wa_id: '1' } },
    });
    runCase({
      on: events.onDocumentReceived.bind(events),
      off: events.offDocumentReceived.bind(events),
      emit: events.emitDocumentReceived.bind(events),
      payload: { message: { type: 'document', document: { link: 'u' } }, contact: { wa_id: '1' } },
    });
    runCase({
      on: events.onLocationReceived.bind(events),
      off: events.offLocationReceived.bind(events),
      emit: events.emitLocationReceived.bind(events),
      payload: {
        message: { type: 'location', location: { latitude: 0, longitude: 0 } },
        contact: { wa_id: '1' },
      },
    });
    runCase({
      on: events.onTemplateReceived.bind(events),
      off: events.offTemplateReceived.bind(events),
      emit: events.emitTemplateReceived.bind(events),
      payload: { message: { type: 'template', template: { name: 't' } }, contact: { wa_id: '1' } },
    });
    runCase({
      on: events.onInteractiveReceived.bind(events),
      off: events.offInteractiveReceived.bind(events),
      emit: events.emitInteractiveReceived.bind(events),
      payload: {
        message: {
          type: 'interactive',
          interactive: { type: 'button', button_reply: { id: 'b', title: 'B' } },
        },
        contact: { wa_id: '1' },
      },
    });
    runCase({
      on: events.onContactsReceived.bind(events),
      off: events.offContactsReceived.bind(events),
      emit: events.emitContactsReceived.bind(events),
      payload: {
        message: { type: 'contacts', contacts: [{ name: { formatted_name: 'x' } }] },
        contact: { wa_id: '1' },
      },
    });
    runCase({
      on: events.onSystemReceived.bind(events),
      off: events.offSystemReceived.bind(events),
      emit: events.emitSystemReceived.bind(events),
      payload: { message: { type: 'system', system: { type: 'sys' } }, contact: { wa_id: '1' } },
    });
    runCase({
      on: events.onOrderReceived.bind(events),
      off: events.offOrderReceived.bind(events),
      emit: events.emitOrderReceived.bind(events),
      payload: {
        message: { type: 'order', order: { product_items: [] } },
        contact: { wa_id: '1' },
      },
    });
    runCase({
      on: events.onProductReceived.bind(events),
      off: events.offProductReceived.bind(events),
      emit: events.emitProductReceived.bind(events),
      payload: {
        message: { type: 'product', product: { retailer_id: 'p' } },
        contact: { wa_id: '1' },
      },
    });
    runCase({
      on: events.onReactionReceived.bind(events),
      off: events.offReactionReceived.bind(events),
      emit: events.emitReactionReceived.bind(events),
      payload: {
        message: { type: 'reaction', reaction: { message_id: 'm' } },
        contact: { wa_id: '1' },
      },
    });
  });
});
