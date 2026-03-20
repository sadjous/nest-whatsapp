import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WhatsAppEvents } from 'nest-whatsapp';

@Injectable()
export class WaEventsLogger implements OnModuleInit {
  private readonly logger = new Logger(WaEventsLogger.name);
  constructor(private readonly events: WhatsAppEvents) {}

  onModuleInit(): void {
    this.events.onTextReceived(({ message, contact }) => {
      this.logger.log(`Text from ${contact?.wa_id ?? 'unknown'}: ${message.text.body}`);
    });
    this.events.onImageReceived(({ message, contact }) => {
      this.logger.log(`Image from ${contact?.wa_id ?? 'unknown'}: ${message.image.link}`);
    });
    this.events.onInteractiveReceived(({ message, contact }) => {
      const type = message.interactive.type;
      this.logger.log(`Interactive(${type}) from ${contact?.wa_id ?? 'unknown'}`);
    });
    this.events.onStatusReceived(({ status, contact }) => {
      this.logger.log(`Status for ${contact?.wa_id ?? 'unknown'}: ${status.status}`);
    });
    this.events.onContactsReceived(({ message, contact }) => {
      this.logger.log(`Contacts from ${contact?.wa_id ?? 'unknown'}: ${message.contacts.length}`);
    });
    this.events.onSystemReceived(({ message, contact }) => {
      this.logger.log(
        `System for ${contact?.wa_id ?? 'unknown'}: ${message.system.type ?? 'system'}`
      );
    });
    this.events.onOrderReceived(({ message, contact }) => {
      const cnt = message.order.product_items?.length ?? 0;
      this.logger.log(`Order from ${contact?.wa_id ?? 'unknown'}: ${cnt} items`);
    });
    this.events.onProductReceived(({ message, contact }) => {
      this.logger.log(
        `Product from ${contact?.wa_id ?? 'unknown'}: ${message.product.retailer_id}`
      );
    });
  }
}
