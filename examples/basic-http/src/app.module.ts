import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import whatsappConfig, { WhatsappConfigSchema } from './whatsapp.config';
import {
  WhatsAppModule,
  WhatsAppMode,
  WhatsAppModule as WhatsAppMicroServiceModule,
} from '@softzenit/nest-whatsapp';
import { WhatsAppHealthModule } from '@softzenit/nest-whatsapp/health';
import { WhatsAppMetricsModule } from '@softzenit/nest-whatsapp/metrics';
import { HealthController } from './health.controller';
import { WaEventsLogger } from './wa-events.logger';
import { WaMicroClientService } from './wa-micro-client.service';
import { TerminusModule } from '@nestjs/terminus';
import { WhatsAppController } from './whatsapp.controller';
import { MetricsController } from './metrics.controller';
import { WaMicroController } from './wa-micro.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [whatsappConfig],
      validationSchema: WhatsappConfigSchema,
    }),
    TerminusModule,
    WhatsAppHealthModule,
    WhatsAppMetricsModule,
    WhatsAppModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mode = config.get<string>('WHATSAPP_MODE') ?? WhatsAppMode.LIVE;
        if (mode === WhatsAppMode.SANDBOX) {
          return {
            mode: WhatsAppMode.SANDBOX,
            testPhoneNumberId: config.getOrThrow<string>('WHATSAPP_SANDBOX_PHONE_NUMBER_ID'),
            temporaryAccessToken: config.getOrThrow<string>('WHATSAPP_SANDBOX_ACCESS_TOKEN'),
            testRecipients:
              config.get<string>('WHATSAPP_SANDBOX_TEST_RECIPIENTS')?.split(',') ?? [],
          };
        }
        return {
          mode: WhatsAppMode.LIVE,
          businessAccountId: config.getOrThrow<string>('WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID'),
          phoneNumberId: config.getOrThrow<string>('WHATSAPP_LIVE_PHONE_NUMBER_ID'),
          accessToken: config.getOrThrow<string>('WHATSAPP_LIVE_ACCESS_TOKEN'),
        };
      },
    }),
    // TCP client to talk to the microservice example
    WhatsAppMicroServiceModule.forMicroservice({
      host: process.env.WHATSAPP_MICROSERVICE_HOST || '127.0.0.1',
      port: +(process.env.WHATSAPP_MICROSERVICE_PORT || 4000),
      clientName: 'WA_CLIENT',
    }),
  ],
  controllers: [WhatsAppController, HealthController, MetricsController, WaMicroController],
  providers: [WaEventsLogger, WaMicroClientService],
})
export class AppModule {}
