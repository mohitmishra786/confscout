/**
 * Unit tests for email.ts
 */

import { Conference } from '@/types/conference';

// Mock functions must be created before jest.mock calls
const mockSendMail = jest.fn();

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

// Mock groqEmail
jest.mock('@/lib/groqEmail', () => ({
  generateEmailContent: jest.fn().mockResolvedValue('<div>Mocked content</div>'),
  categorizeConferencesForEmail: jest.fn().mockReturnValue([
    {
      title: 'Test Section',
      conferences: [],
    },
  ]),
  generateFallbackEmailContent: jest.fn().mockReturnValue('<div>Fallback</div>'),
}));

// Import after mocks are set up
import {
  sendWelcomeEmail,
  sendUnsubscribeEmail,
  sendDigestEmail,
  categorizeConferencesForEmail,
} from '@/lib/email';

describe('Email Service', () => {
  const mockConference: Conference = {
    id: 'test-1',
    name: 'Test Conference',
    url: 'https://testconf.com',
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: {
      city: 'San Francisco',
      country: 'USA',
      raw: 'San Francisco, USA',
    },
    online: false,
    cfp: {
      url: 'https://testconf.com/cfp',
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open',
    },
    domain: 'software',
    source: 'test',
  };

  beforeEach(() => {
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct parameters', async () => {
      await sendWelcomeEmail('test@example.com', 'token123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Welcome to ConfScout!',
        })
      );
    });

    it('should include unsubscribe link', async () => {
      await sendWelcomeEmail('test@example.com', 'token123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'List-Unsubscribe': expect.stringContaining('unsubscribe'),
          }),
        })
      );
    });

    it('should not contain emojis in welcome email', async () => {
      await sendWelcomeEmail('test@example.com', 'token123');

      const callArgs = mockSendMail.mock.calls[0][0];
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
      expect(callArgs.html).not.toMatch(emojiRegex);
      expect(callArgs.subject).not.toMatch(emojiRegex);
    });
  });

  describe('sendUnsubscribeEmail', () => {
    it('should send unsubscribe confirmation', async () => {
      await sendUnsubscribeEmail('test@example.com', 'token123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'You have been unsubscribed',
        })
      );
    });

    it('should include website link', async () => {
      await sendUnsubscribeEmail('test@example.com', 'token123');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('confscouting.com');
    });

    it('should include List-Unsubscribe header', async () => {
      await sendUnsubscribeEmail('test@example.com', 'token123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'List-Unsubscribe': expect.stringContaining('unsubscribe'),
          }),
        })
      );
    });
  });

  describe('sendDigestEmail', () => {
    it('should send digest with weekly frequency', async () => {
      await sendDigestEmail(
        'test@example.com',
        'token123',
        [mockConference],
        'weekly',
        undefined,
        false // Don't use Groq for this test
      );

      expect(mockSendMail).toHaveBeenCalled();
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toContain('Weekly');
    });

    it('should send digest with daily frequency', async () => {
      await sendDigestEmail(
        'test@example.com',
        'token123',
        [mockConference],
        'daily',
        undefined,
        false
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toContain('Daily');
    });

    it('should include unsubscribe header', async () => {
      await sendDigestEmail(
        'test@example.com',
        'token123',
        [mockConference],
        'weekly',
        undefined,
        false
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'List-Unsubscribe': expect.stringContaining('token123'),
          }),
        })
      );
    });

    it('should include both HTML and text versions', async () => {
      await sendDigestEmail(
        'test@example.com',
        'token123',
        [mockConference],
        'weekly',
        undefined,
        false
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.any(String),
          text: expect.any(String),
        })
      );
    });

    it('should return success status', async () => {
      const result = await sendDigestEmail(
        'test@example.com',
        'token123',
        [mockConference],
        'weekly',
        undefined,
        false
      );

      expect(result).toEqual(
        expect.objectContaining({
          sent: true,
          subject: expect.any(String),
          sectionsCount: expect.any(Number),
        })
      );
    });

    it('should fallback when Groq fails', async () => {
      const { generateEmailContent } = jest.requireMock('@/lib/groqEmail');
      generateEmailContent.mockRejectedValueOnce(new Error('API Error'));

      await sendDigestEmail(
        'test@example.com',
        'token123',
        [mockConference],
        'weekly',
        undefined,
        true
      );

      // Should still send email using fallback
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should not use Groq when API key is missing', async () => {
      const originalKey = process.env.GROQ_API_KEY;
      const { generateEmailContent } = jest.requireMock('@/lib/groqEmail');

      try {
        // Clear the API key
        process.env.GROQ_API_KEY = '';
        generateEmailContent.mockClear();

        await sendDigestEmail(
          'test@example.com',
          'token123',
          [mockConference],
          'weekly',
          undefined,
          true
        );

        // Groq should not have been called when API key is missing
        expect(generateEmailContent).not.toHaveBeenCalled();
        // But email should still be sent using fallback
        expect(mockSendMail).toHaveBeenCalled();
      } finally {
        process.env.GROQ_API_KEY = originalKey;
      }
    });

    it('should include conference count in subject', async () => {
      const secondConf = { ...mockConference, id: 'test-2' };
      await sendDigestEmail(
        'test@example.com',
        'token123',
        [mockConference, secondConf],
        'weekly',
        undefined,
        false
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toContain('2');
    });
  });

  describe('Re-exported functions', () => {
    it('should export categorizeConferencesForEmail', () => {
      expect(categorizeConferencesForEmail).toBeDefined();
      expect(typeof categorizeConferencesForEmail).toBe('function');
    });
  });
});
