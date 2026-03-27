import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsAppModule, WhatsAppMode } from '@softzenit/nest-whatsapp';
import { WaController } from './wa.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Expose a TCP client for other apps
    WhatsAppModule.forMicroservice({
      host: process.env.WHATSAPP_MICROSERVICE_HOST!,
      port: +process.env.WHATSAPP_MICROSERVICE_PORT!,
    }),
    // Configure WhatsApp credentials to send messages from this microservice
    WhatsAppModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mode = config.get<string>('WHATSAPP_MODE') ?? WhatsAppMode.LIVE;
        return mode === WhatsAppMode.SANDBOX
          ? {
              mode: WhatsAppMode.SANDBOX,
              testPhoneNumberId: config.getOrThrow<string>('WHATSAPP_SANDBOX_PHONE_NUMBER_ID'),
              temporaryAccessToken: config.getOrThrow<string>('WHATSAPP_SANDBOX_ACCESS_TOKEN'),
              testRecipients:
                config.get<string>('WHATSAPP_SANDBOX_TEST_RECIPIENTS')?.split(',') ?? [],
            }
          : {
              mode: WhatsAppMode.LIVE,
              businessAccountId: config.getOrThrow<string>('WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID'),
              phoneNumberId: config.getOrThrow<string>('WHATSAPP_LIVE_PHONE_NUMBER_ID'),
              accessToken: config.getOrThrow<string>('WHATSAPP_LIVE_ACCESS_TOKEN'),
            };
      },
    }),
  ],
  controllers: [WaController],
})
export class AppModule {}
