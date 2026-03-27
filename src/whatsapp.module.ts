import {
  DynamicModule,
  Provider,
  Logger,
  type InjectionToken,
  type ModuleMetadata,
  type OptionalFactoryDependency,
} from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './services/whatsapp.service';
import {
  type WhatsAppClientOptions,
  WhatsAppMode,
} from './interfaces/whatsapp-client-options.interface';
import type { WhatsAppMicroserviceOptions } from './interfaces/whatsapp-microservice-options.interface';
import {
  WhatsAppEvents,
  WHATSAPP_EVENT_EMITTER,
  type WhatsAppEventEmitter,
} from './services/whatsapp.events';
import { WhatsAppWebhookProcessor } from './services/whatsapp.webhook-processor';
import { WhatsAppController } from './controllers/whatsapp.controller';
import type { EventEmitter } from 'node:events';
import {
  WHATSAPP_RUNTIME_OPTIONS,
  type WhatsAppRuntimeOptions,
} from './interfaces/whatsapp-runtime-options.interface';
import { WhatsAppMediaService } from './services/whatsapp.media.service';
import { WhatsAppTemplatesService } from './services/whatsapp.templates.service';
import { WhatsAppPhoneNumbersService } from './services/whatsapp.phone-numbers.service';

const ASYNC_CLIENTS_TOKEN = 'WHATSAPP_MODULE_ASYNC_CLIENTS';
const KNOWN_CLIENT_MODES: WhatsAppClientOptions['mode'][] = [
  WhatsAppMode.SANDBOX,
  WhatsAppMode.LIVE,
];

type AsyncFactoryResult =
  | WhatsAppClientOptions
  | WhatsAppClientOptions[]
  | Promise<WhatsAppClientOptions | WhatsAppClientOptions[]>;

export interface WhatsAppModuleAsyncOptions<TDeps extends unknown[] = unknown[]> extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  useFactory: (...args: TDeps) => AsyncFactoryResult;
}

const eventEmitterProvider: Provider = {
  provide: WHATSAPP_EVENT_EMITTER,
  useFactory: (): WhatsAppEventEmitter => createEventEmitterInstance(),
};

const runtimeOptionsProvider: Provider = {
  provide: WHATSAPP_RUNTIME_OPTIONS,
  useFactory: (): WhatsAppRuntimeOptions => resolveRuntimeOptions(),
};

function createEventEmitterInstance(): WhatsAppEventEmitter {
  const emitterCtor = resolveEventEmitter2();
  if (emitterCtor) {
    return new emitterCtor();
  }
  const { EventEmitter } = require('node:events') as { EventEmitter: new () => EventEmitter };
  const emitter = new EventEmitter() as EventEmitter & Partial<WhatsAppEventEmitter>;
  if (typeof emitter.off !== 'function' && typeof emitter.removeListener === 'function') {
    emitter.off = emitter.removeListener.bind(emitter);
  }
  return emitter as WhatsAppEventEmitter;
}

function resolveRuntimeOptions(): WhatsAppRuntimeOptions {
  return {
    apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v25.0',
    httpTimeoutMs: Number(process.env.WHATSAPP_HTTP_TIMEOUT_MS ?? '10000'),
    httpRetries: Number(process.env.WHATSAPP_HTTP_RETRIES ?? '2'),
    httpMaxRetryDelayMs: Number(process.env.WHATSAPP_HTTP_MAX_RETRY_DELAY_MS ?? '5000'),
    maskPhoneLogs: process.env.WHATSAPP_MASK_PHONE_LOGS !== 'false',
    logMessageBodies: process.env.WHATSAPP_LOG_MESSAGE_BODIES === 'true',
  };
}
function resolveEventEmitter2():
  | (new () => WhatsAppEventEmitter & { onAny?: (...args: unknown[]) => void })
  | undefined {
  const candidates = ['@nestjs/event-emitter', 'eventemitter2'];
  for (const candidate of candidates) {
    try {
      const mod = require(candidate);
      if (mod?.EventEmitter2) {
        return mod.EventEmitter2;
      }
    } catch {
      // ignore optional dependency failures
    }
  }
  return undefined;
}

function createHttpModule() {
  return HttpModule.register({
    timeout: Number(process.env.WHATSAPP_HTTP_TIMEOUT_MS ?? '10000'),
    maxRedirects: 0,
    validateStatus: (status: number) => status < 400,
  });
}

export class WhatsAppModule {
  static forRoot(options: WhatsAppClientOptions | WhatsAppClientOptions[]): DynamicModule {
    const clients = Array.isArray(options) ? options : [options];
    const providers: Provider[] = clients.map((client) => ({
      provide: `WHATSAPP_CLIENT_${client.mode.toUpperCase()}`,
      useValue: client,
    }));
    return {
      module: WhatsAppModule,
      imports: [createHttpModule()],
      controllers: [WhatsAppController],
      providers: [
        // Provide an EventEmitter instance (EventEmitter2 if available, else Node's EventEmitter)
        eventEmitterProvider,
        runtimeOptionsProvider,
        ...providers,
        WhatsAppService,
        WhatsAppEvents,
        WhatsAppWebhookProcessor,
        WhatsAppMediaService,
        WhatsAppTemplatesService,
        WhatsAppPhoneNumbersService,
      ],
      exports: [
        WhatsAppService,
        WhatsAppEvents,
        WhatsAppMediaService,
        WhatsAppTemplatesService,
        WhatsAppPhoneNumbersService,
      ],
    };
  }

  static forRootAsync<TDeps extends unknown[] = unknown[]>(
    options: WhatsAppModuleAsyncOptions<TDeps>
  ): DynamicModule {
    if (typeof options?.useFactory !== 'function') {
      throw new TypeError('WhatsAppModule.forRootAsync requires a useFactory function');
    }

    const asyncClientsProvider: Provider = {
      provide: ASYNC_CLIENTS_TOKEN,
      inject: options.inject ?? [],
      useFactory: async (...args: unknown[]) => {
        const result = await (options.useFactory as (...a: unknown[]) => AsyncFactoryResult)(
          ...args
        );
        const clients = Array.isArray(result) ? result : [result];
        return clients;
      },
    };

    const clientProviders: Provider[] = KNOWN_CLIENT_MODES.map((mode) => ({
      provide: `WHATSAPP_CLIENT_${mode.toUpperCase()}`,
      inject: [ASYNC_CLIENTS_TOKEN],
      useFactory: (clients: WhatsAppClientOptions[]) =>
        clients.find((client) => client.mode === mode),
    }));

    return {
      module: WhatsAppModule,
      imports: [createHttpModule(), ...(options.imports ?? [])],
      controllers: [WhatsAppController],
      providers: [
        eventEmitterProvider,
        runtimeOptionsProvider,
        asyncClientsProvider,
        ...clientProviders,
        WhatsAppService,
        WhatsAppEvents,
        WhatsAppWebhookProcessor,
        WhatsAppMediaService,
        WhatsAppTemplatesService,
        WhatsAppPhoneNumbersService,
      ],
      exports: [
        WhatsAppService,
        WhatsAppEvents,
        WhatsAppMediaService,
        WhatsAppTemplatesService,
        WhatsAppPhoneNumbersService,
      ],
    };
  }

  // forMicroservice registers a TCP client only — it does not mount the webhook controller.
  // If you also need webhook handling, import WhatsAppModule.forRoot/forRootAsync separately.
  static forMicroservice(options: WhatsAppMicroserviceOptions): DynamicModule {
    if (options.clientName !== undefined && !options.clientName.trim()) {
      throw new Error('WhatsAppModule.forMicroservice clientName must be a non-empty string');
    }
    const clientName = options.clientName || 'WHATSAPP_MICROSERVICE';
    new Logger('WhatsAppModule').log(
      `Microservice client '${clientName}' -> tcp://${options.host}:${options.port}`
    );
    // Lazy import microservices to avoid requiring it unless used
    const micro: typeof import('@nestjs/microservices') = require('@nestjs/microservices');
    const ClientsModule = micro.ClientsModule;
    const Transport = micro.Transport;
    return {
      module: WhatsAppModule,
      imports: [
        createHttpModule(),
        ClientsModule.register([
          {
            name: clientName,
            transport: Transport.TCP,
            options: { host: options.host, port: options.port },
          },
        ]),
      ],
      providers: [
        eventEmitterProvider,
        runtimeOptionsProvider,
        WhatsAppService,
        WhatsAppEvents,
        WhatsAppWebhookProcessor,
        WhatsAppMediaService,
        WhatsAppTemplatesService,
        WhatsAppPhoneNumbersService,
      ],
      exports: [
        WhatsAppService,
        WhatsAppEvents,
        WhatsAppMediaService,
        WhatsAppTemplatesService,
        WhatsAppPhoneNumbersService,
        ClientsModule,
      ],
    };
  }
}
