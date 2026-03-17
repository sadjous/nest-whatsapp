import 'dotenv/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

async function run() {
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: process.env.WHATSAPP_MICROSERVICE_HOST || '127.0.0.1',
      port: +(process.env.WHATSAPP_MICROSERVICE_PORT || 4000),
    },
  });
  await client.connect();
  try {
    const to = process.env.WHATSAPP_E2E_RECIPIENT || '+15550000000';
    console.log('Sending demo text via microservice…');
    const textResult = await firstValueFrom(
      client.send('wa.sendText', { to, message: 'Hello from demo client' })
    );
    console.log(textResult);
    console.log('Sending demo template…');
    const templateResult = await firstValueFrom(
      client.send('wa.sendTemplate', {
        to,
        templateName: process.env.WHATSAPP_E2E_TEMPLATE || 'hello_world',
        variables: ['demo'],
      })
    );
    console.log(templateResult);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error('Demo client failed', err);
  process.exitCode = 1;
});
