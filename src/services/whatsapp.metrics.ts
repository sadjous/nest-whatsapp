import { Injectable } from '@nestjs/common';
import type { WhatsAppMode } from '../interfaces/whatsapp-client-options.interface';
import { Counter, Gauge, Histogram, collectDefaultMetrics, register } from 'prom-client';
import type { WhatsAppMessageType } from '../interfaces/webhook.interfaces';

type MessagesSentLabels = 'type' | 'mode';
type ErrorsLabels = 'type' | 'mode' | 'status';
type RequestDurationLabels = 'type' | 'mode' | 'status';
type BuildInfoLabels = 'version' | 'node_version' | 'environment';

let defaultMetricsRegistered = false;

@Injectable()
export class WhatsAppMetricsService {
  private readonly messagesSentCounter: Counter<MessagesSentLabels>;
  private readonly errorsCounter: Counter<ErrorsLabels>;
  private readonly webhookCounter: Counter<string>;
  private readonly requestDuration: Histogram<RequestDurationLabels>;
  private readonly buildInfoGauge: Gauge<BuildInfoLabels>;

  constructor() {
    if (!defaultMetricsRegistered) {
      collectDefaultMetrics({ register });
      defaultMetricsRegistered = true;
    }
    this.messagesSentCounter =
      (register.getSingleMetric('whatsapp_messages_sent_total') as Counter<MessagesSentLabels>) ||
      new Counter({
        name: 'whatsapp_messages_sent_total',
        help: 'Total number of WhatsApp messages sent',
        labelNames: ['type', 'mode'],
      });
    this.errorsCounter =
      (register.getSingleMetric('whatsapp_errors_total') as Counter<ErrorsLabels>) ||
      new Counter({
        name: 'whatsapp_errors_total',
        help: 'Total number of WhatsApp errors',
        labelNames: ['type', 'mode', 'status'],
      });
    this.webhookCounter =
      (register.getSingleMetric('whatsapp_webhook_events_total') as Counter<string>) ||
      new Counter({
        name: 'whatsapp_webhook_events_total',
        help: 'Total number of incoming WhatsApp webhook events',
      });
    this.requestDuration =
      (register.getSingleMetric(
        'whatsapp_request_duration_seconds'
      ) as Histogram<RequestDurationLabels>) ||
      new Histogram({
        name: 'whatsapp_request_duration_seconds',
        help: 'Duration of WhatsApp outbound requests',
        labelNames: ['type', 'mode', 'status'],
        buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      });
    this.buildInfoGauge =
      (register.getSingleMetric('whatsapp_build_info') as Gauge<BuildInfoLabels>) ||
      new Gauge({
        name: 'whatsapp_build_info',
        help: 'Build/version metadata for the WhatsApp module',
        labelNames: ['version', 'node_version', 'environment'],
      });
    const pkg = this.resolvePackageMetadata();
    this.buildInfoGauge
      .labels({
        version: pkg.version ?? 'unknown',
        node_version: process.version,
        environment: process.env.NODE_ENV ?? 'development',
      })
      .set(1);
  }

  incrementMessagesSent(type: WhatsAppMessageType, mode: WhatsAppMode): void {
    this.messagesSentCounter.labels({ type, mode }).inc();
  }

  incrementErrors(type: WhatsAppMessageType, mode: WhatsAppMode, status: string): void {
    this.errorsCounter.labels({ type, mode, status }).inc();
  }

  incrementWebhookEvents(): void {
    this.webhookCounter.inc();
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }

  startRequestTimer(
    type: WhatsAppMessageType,
    mode: WhatsAppMode
  ): (labels?: { status?: string }) => void {
    return this.requestDuration.startTimer({ type, mode });
  }

  private resolvePackageMetadata(): { version?: string } {
    try {
      return require('../../package.json') as { version?: string };
    } catch {
      return {};
    }
  }
}
