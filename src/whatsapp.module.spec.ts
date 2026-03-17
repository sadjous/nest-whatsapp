import { Test } from '@nestjs/testing';
import { WhatsAppModule } from './whatsapp.module';
import { WhatsAppClientOptions } from './interfaces/whatsapp-client-options.interface';

describe('WhatsAppModule.forRoot', () => {
  it('binds synchronous config to the correct client token', async () => {
    const config: WhatsAppClientOptions = {
      mode: 'sandbox',
      testPhoneNumberId: 'pn-sync',
      temporaryAccessToken: 'tok-sync',
      testRecipients: ['+10000000001'],
    };

    const moduleRef = await Test.createTestingModule({
      imports: [WhatsAppModule.forRoot(config)],
    }).compile();

    const resolved = moduleRef.get<WhatsAppClientOptions>('WHATSAPP_CLIENT_SANDBOX');
    expect(resolved).toEqual(config);

    await moduleRef.close();
  });
});

describe('WhatsAppModule.forRootAsync', () => {
  it('binds async factory output to sandbox token', async () => {
    const sandboxConfig: WhatsAppClientOptions = {
      mode: 'sandbox',
      testPhoneNumberId: 'pn',
      temporaryAccessToken: 'token',
      testRecipients: ['+10000000000'],
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        WhatsAppModule.forRootAsync({
          useFactory: async () => sandboxConfig,
        }),
      ],
    }).compile();

    const resolved = moduleRef.get<WhatsAppClientOptions>('WHATSAPP_CLIENT_SANDBOX');
    expect(resolved).toEqual(sandboxConfig);

    await moduleRef.close();
  });

  it('supports registering multiple clients from async factory', async () => {
    const configs: WhatsAppClientOptions[] = [
      {
        mode: 'sandbox',
        testPhoneNumberId: 'pn-multi',
        temporaryAccessToken: 'token-multi',
        testRecipients: [],
      },
      {
        mode: 'live',
        businessAccountId: 'biz',
        phoneNumberId: 'live-pn',
        accessToken: 'live-token',
      },
    ];

    const moduleRef = await Test.createTestingModule({
      imports: [
        WhatsAppModule.forRootAsync({
          useFactory: () => Promise.resolve(configs),
        }),
      ],
    }).compile();

    expect(moduleRef.get<WhatsAppClientOptions>('WHATSAPP_CLIENT_SANDBOX')).toEqual(configs[0]);
    expect(moduleRef.get<WhatsAppClientOptions>('WHATSAPP_CLIENT_LIVE')).toEqual(configs[1]);

    await moduleRef.close();
  });
});
