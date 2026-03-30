import { HttpStatus } from '@nestjs/common';
import { WhatsAppMessageType } from './webhook.interfaces';
import { WhatsAppMode } from './whatsapp-client-options.interface';

export const WHATSAPP_METRICS_SERVICE = 'WHATSAPP_METRICS_SERVICE';

export interface IWhatsAppMetrics {
  incrementMessagesSent(type: WhatsAppMessageType, mode: WhatsAppMode): void;
  incrementErrors(type: WhatsAppMessageType, mode: WhatsAppMode, status: HttpStatus | string): void;
  startRequestTimer(
    type: WhatsAppMessageType,
    mode: WhatsAppMode
  ): (labels?: { status?: string }) => void;
  incrementWebhookEvents(): void;
  getMetrics(): Promise<string>;
}
