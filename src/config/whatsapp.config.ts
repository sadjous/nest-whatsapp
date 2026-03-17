import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export default registerAs('whatsapp', () => ({
  mode: process.env.WHATSAPP_MODE,
  sandbox: {
    testPhoneNumberId: process.env.WHATSAPP_SANDBOX_PHONE_NUMBER_ID,
    temporaryAccessToken: process.env.WHATSAPP_SANDBOX_ACCESS_TOKEN,
    testRecipients: process.env.WHATSAPP_SANDBOX_TEST_RECIPIENTS?.split(',') || [],
  },
  live: {
    businessAccountId: process.env.WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID,
    phoneNumberId: process.env.WHATSAPP_LIVE_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_LIVE_ACCESS_TOKEN,
  },
  webhook: {
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    maxBodyBytes: Number(process.env.WHATSAPP_WEBHOOK_MAX_BODY_BYTES ?? '2000000'),
  },
  logging: {
    maskPhoneNumbers: process.env.WHATSAPP_MASK_PHONE_LOGS !== 'false',
    logMessageBodies: process.env.WHATSAPP_LOG_MESSAGE_BODIES === 'true',
  },
  health: {
    timeoutMs: Number(process.env.WHATSAPP_HEALTH_TIMEOUT_MS ?? '3000'),
    skipExternalCheck: process.env.WHATSAPP_HEALTH_SKIP_EXTERNAL === 'true',
  },
}));

export const WhatsappConfigSchema = Joi.object({
  WHATSAPP_MODE: Joi.string().valid('sandbox', 'live').required(),
  WHATSAPP_SANDBOX_PHONE_NUMBER_ID: Joi.string().when('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.required(),
  }),
  WHATSAPP_SANDBOX_ACCESS_TOKEN: Joi.string().when('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.required(),
  }),
  WHATSAPP_SANDBOX_TEST_RECIPIENTS: Joi.string().when('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.required(),
  }),
  WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID: Joi.string().when('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.required(),
  }),
  WHATSAPP_LIVE_PHONE_NUMBER_ID: Joi.string().when('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.required(),
  }),
  WHATSAPP_LIVE_ACCESS_TOKEN: Joi.string().when('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.required(),
  }),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: Joi.string().required(),
  WHATSAPP_APP_SECRET: Joi.string().required(),
  WHATSAPP_WEBHOOK_MAX_BODY_BYTES: Joi.number().positive().optional(),
  WHATSAPP_MASK_PHONE_LOGS: Joi.string().valid('true', 'false').optional(),
  WHATSAPP_LOG_MESSAGE_BODIES: Joi.string().valid('true', 'false').optional(),
  WHATSAPP_HEALTH_TIMEOUT_MS: Joi.number().positive().optional(),
  WHATSAPP_HEALTH_SKIP_EXTERNAL: Joi.string().valid('true', 'false').optional(),
});
