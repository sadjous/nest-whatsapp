import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { WhatsAppPhoneNumbersService } from './whatsapp.phone-numbers.service';
import {
  WhatsAppAuthException,
  WhatsAppRateLimitException,
} from '../exceptions/whatsapp.exceptions';

function mockGet<T>(data: T): jest.Mock {
  return jest.fn().mockReturnValue(of({ data } as AxiosResponse<T>));
}
function mockPost<T>(data: T): jest.Mock {
  return jest.fn().mockReturnValue(of({ data } as AxiosResponse<T>));
}
function mockError(status: number): jest.Mock {
  return jest.fn().mockReturnValue(throwError(() => ({ response: { status } })));
}

const liveConfig = {
  mode: 'live' as const,
  businessAccountId: 'waba-123',
  phoneNumberId: 'pn-123',
  accessToken: 'token-abc',
};

const rawPhoneNumber = {
  id: 'pn-123',
  display_phone_number: '+1 555-000-0000',
  verified_name: 'Test Business',
  name_status: 'APPROVED',
  quality_rating: 'GREEN',
  account_mode: 'LIVE',
  is_official_business_account: false,
};

const normalizedPhoneNumber = {
  id: 'pn-123',
  displayPhoneNumber: '+1 555-000-0000',
  verifiedName: 'Test Business',
  nameStatus: 'APPROVED',
  qualityRating: 'GREEN',
  accountMode: 'LIVE',
  isOfficialBusinessAccount: false,
};

describe('WhatsAppPhoneNumbersService', () => {
  let service: WhatsAppPhoneNumbersService;
  let httpGet: jest.Mock;
  let httpPost: jest.Mock;

  beforeEach(async () => {
    httpGet = jest.fn();
    httpPost = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppPhoneNumbersService,
        { provide: HttpService, useValue: { get: httpGet, post: httpPost } },
        { provide: 'WHATSAPP_CLIENT_LIVE', useValue: liveConfig },
      ],
    }).compile();

    service = module.get(WhatsAppPhoneNumbersService);
  });

  describe('listPhoneNumbers', () => {
    it('returns normalized phone numbers', async () => {
      httpGet.mockImplementation(mockGet({ data: [rawPhoneNumber] }));
      const result = await service.listPhoneNumbers('waba-123');
      expect(result).toEqual([normalizedPhoneNumber]);
      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining('/waba-123/phone_numbers'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
        })
      );
    });

    it('throws WhatsAppAuthException on 401', async () => {
      httpGet.mockImplementation(mockError(401));
      await expect(service.listPhoneNumbers('waba-123')).rejects.toThrow(WhatsAppAuthException);
    });

    it('throws WhatsAppRateLimitException on 429', async () => {
      httpGet.mockImplementation(mockError(429));
      await expect(service.listPhoneNumbers('waba-123')).rejects.toThrow(
        WhatsAppRateLimitException
      );
    });
  });

  describe('getPhoneNumber', () => {
    it('returns a normalized phone number', async () => {
      httpGet.mockImplementation(mockGet(rawPhoneNumber));
      const result = await service.getPhoneNumber('pn-123');
      expect(result).toEqual(normalizedPhoneNumber);
      expect(httpGet).toHaveBeenCalledWith(expect.stringContaining('/pn-123'), expect.anything());
    });

    it('throws WhatsAppAuthException on 401', async () => {
      httpGet.mockImplementation(mockError(401));
      await expect(service.getPhoneNumber('pn-123')).rejects.toThrow(WhatsAppAuthException);
    });

    it('throws WhatsAppRateLimitException on 429', async () => {
      httpGet.mockImplementation(mockError(429));
      await expect(service.getPhoneNumber('pn-123')).rejects.toThrow(WhatsAppRateLimitException);
    });

    it('wraps unknown errors into a safe error without raw details', async () => {
      httpGet.mockReturnValue(throwError(() => new Error('network fail')));
      await expect(service.getPhoneNumber('pn-123')).rejects.toThrow('WhatsApp API error');
    });
  });

  describe('requestVerificationCode', () => {
    it('posts to request_code and returns true', async () => {
      httpPost.mockImplementation(mockPost({ success: true }));
      const result = await service.requestVerificationCode('pn-123', 'SMS');
      expect(result).toBe(true);
      expect(httpPost).toHaveBeenCalledWith(
        expect.stringContaining('/pn-123/request_code'),
        { code_method: 'SMS', language: 'en_US' },
        expect.anything()
      );
    });

    it('accepts a custom locale', async () => {
      httpPost.mockImplementation(mockPost({ success: true }));
      await service.requestVerificationCode('pn-123', 'VOICE', 'fr_FR');
      expect(httpPost).toHaveBeenCalledWith(
        expect.anything(),
        { code_method: 'VOICE', language: 'fr_FR' },
        expect.anything()
      );
    });

    it('throws WhatsAppAuthException on 401', async () => {
      httpPost.mockImplementation(mockError(401));
      await expect(service.requestVerificationCode('pn-123', 'SMS')).rejects.toThrow(
        WhatsAppAuthException
      );
    });

    it('throws WhatsAppRateLimitException on 429', async () => {
      httpPost.mockImplementation(mockError(429));
      await expect(service.requestVerificationCode('pn-123', 'VOICE')).rejects.toThrow(
        WhatsAppRateLimitException
      );
    });
  });

  describe('verifyCode', () => {
    it('posts the code and returns true', async () => {
      httpPost.mockImplementation(mockPost({ success: true }));
      const result = await service.verifyCode('pn-123', '123456');
      expect(result).toBe(true);
      expect(httpPost).toHaveBeenCalledWith(
        expect.stringContaining('/pn-123/verify_code'),
        { code: '123456' },
        expect.anything()
      );
    });

    it('throws WhatsAppAuthException on 403', async () => {
      httpPost.mockImplementation(mockError(403));
      await expect(service.verifyCode('pn-123', '000000')).rejects.toThrow(WhatsAppAuthException);
    });
  });

  describe('setTwoStepPin', () => {
    it('posts the pin and returns true', async () => {
      httpPost.mockImplementation(mockPost({ success: true }));
      const result = await service.setTwoStepPin('pn-123', '654321');
      expect(result).toBe(true);
      expect(httpPost).toHaveBeenCalledWith(
        expect.stringContaining('/pn-123'),
        { pin: '654321' },
        expect.anything()
      );
    });

    it('throws WhatsAppAuthException on 401', async () => {
      httpPost.mockImplementation(mockError(401));
      await expect(service.setTwoStepPin('pn-123', '111111')).rejects.toThrow(
        WhatsAppAuthException
      );
    });

    it('throws WhatsAppRateLimitException on 429', async () => {
      httpPost.mockImplementation(mockError(429));
      await expect(service.setTwoStepPin('pn-123', '111111')).rejects.toThrow(
        WhatsAppRateLimitException
      );
    });
  });
});
