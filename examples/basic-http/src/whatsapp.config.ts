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
}));

export const WhatsappConfigSchema = Joi.object({
  WHATSAPP_MODE: Joi.string().valid('sandbox', 'live').required(),
  // Require sandbox vars only in sandbox mode; otherwise allow empty or undefined
  WHATSAPP_SANDBOX_PHONE_NUMBER_ID: Joi.alternatives().conditional('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  WHATSAPP_SANDBOX_ACCESS_TOKEN: Joi.alternatives().conditional('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  WHATSAPP_SANDBOX_TEST_RECIPIENTS: Joi.alternatives().conditional('WHATSAPP_MODE', {
    is: 'sandbox',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  // Require live vars only in live mode; otherwise allow empty or undefined
  WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID: Joi.alternatives().conditional('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  WHATSAPP_LIVE_PHONE_NUMBER_ID: Joi.alternatives().conditional('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  WHATSAPP_LIVE_ACCESS_TOKEN: Joi.alternatives().conditional('WHATSAPP_MODE', {
    is: 'live',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
});
