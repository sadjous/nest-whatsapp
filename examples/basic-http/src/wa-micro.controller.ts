import { Body, Controller, Post } from '@nestjs/common';
import { WaMicroClientService } from './wa-micro-client.service';
import type { WhatsAppMode } from 'nest-whatsapp';

@Controller('micro')
export class WaMicroController {
  constructor(private readonly micro: WaMicroClientService) {}

  @Post('send-text')
  sendText(@Body() body: { to: string; message: string; mode?: WhatsAppMode }) {
    return this.micro.sendText(body.to, body.message, body.mode);
  }
}
