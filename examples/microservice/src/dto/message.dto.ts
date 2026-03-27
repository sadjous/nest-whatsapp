import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { WhatsAppMode, WhatsAppContactCard } from '@softzenit/nest-whatsapp';

class BaseSendDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsOptional()
  @IsIn(['sandbox', 'live'])
  mode?: WhatsAppMode;
}

export class SendTextDto extends BaseSendDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class SendTemplateDto extends BaseSendDto {
  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  variables?: string[];
}

export class SendMediaDto extends BaseSendDto {
  @IsString()
  @IsNotEmpty()
  mediaUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}

export class SendDocumentDto extends BaseSendDto {
  @IsString()
  @IsNotEmpty()
  documentUrl!: string;

  @IsString()
  @IsNotEmpty()
  filename!: string;
}

export class SendLocationDto extends BaseSendDto {
  @IsNumber()
  @Type(() => Number)
  latitude!: number;

  @IsNumber()
  @Type(() => Number)
  longitude!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;
}

export class SendContactDto extends BaseSendDto {
  @IsArray()
  @ArrayNotEmpty()
  contacts!: WhatsAppContactCard[];
}

export class MarkAsReadDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsOptional()
  @IsIn(['sandbox', 'live'])
  mode?: WhatsAppMode;
}
