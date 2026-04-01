import type { HttpStatus } from '@nestjs/common';
import type { WhatsAppMessageType } from './webhook.interfaces';
import type { WhatsAppMode } from './whatsapp-client-options.interface';

export const WHATSAPP_METRICS_SERVICE = 'WHATSAPP_METRICS_SERVICE';

export interface IWhatsAppMetrics {
  incrementMessagesSent(type: WhatsAppMessageType, mode: WhatsAppMode): void;
  incrementErrors(type: WhatsAppMessageType, mode: WhatsAppMode, status: HttpStatus | string): void;
  startRequestTimer(
    type: WhatsAppMessageType,
    mode: WhatsAppMode
  ): (labels?: { status?: HttpStatus | string }) => void;
  incrementWebhookEvents(): void;
  getMetrics(): Promise<string>;
}
