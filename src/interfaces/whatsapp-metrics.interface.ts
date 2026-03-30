import { HttpStatus } from '@nestjs/common';
import { WhatsAppMessageType } from './webhook.interfaces';
import { WhatsAppMode } from './whatsapp-client-options.interface';

export const WHATSAPP_METRICS_SERVICE = 'WHATSAPP_METRICS_SERVICE';

export interface IWhatsAppMetrics {
  incrementMessagesSent(type: WhatsAppMessageType | string, mode: WhatsAppMode | string): void;
  incrementErrors(type: WhatsAppMessageType | string, mode: WhatsAppMode | string, status: HttpStatus | string): void;
  startRequestTimer(
    type: WhatsAppMessageType | string,
    mode: WhatsAppMode | string
  ): (labels?: { status?: HttpStatus | string }) => void;
  incrementWebhookEvents(): void;
  getMetrics(): Promise<string>;
}
