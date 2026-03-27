export const WHATSAPP_METRICS_SERVICE = 'WHATSAPP_METRICS_SERVICE';

export interface IWhatsAppMetrics {
  incrementMessagesSent(type: string, mode: string): void;
  incrementErrors(type: string, mode: string, status: string): void;
  startRequestTimer(type: string, mode: string): (labels?: { status?: string }) => void;
  incrementWebhookEvents(): void;
  getMetrics(): Promise<string>;
}
