import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { WhatsAppMode } from '@softzenit/nest-whatsapp';

@Injectable()
export class WaMicroClientService {
  constructor(@Inject('WA_CLIENT') private readonly client: ClientProxy) {}

  sendText(to: string, message: string, mode?: WhatsAppMode) {
    return firstValueFrom(this.client.send('wa.sendText', { to, message, mode }));
  }

  sendMedia(to: string, mediaUrl: string, caption: string, mode?: WhatsAppMode) {
    return firstValueFrom(this.client.send('wa.sendMedia', { to, mediaUrl, caption, mode }));
  }

  sendDocument(to: string, documentUrl: string, filename: string, mode?: WhatsAppMode) {
    return firstValueFrom(this.client.send('wa.sendDocument', { to, documentUrl, filename, mode }));
  }

  sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name: string,
    address: string,
    mode?: WhatsAppMode
  ) {
    return firstValueFrom(
      this.client.send('wa.sendLocation', { to, latitude, longitude, name, address, mode })
    );
  }
}
