/**
 * Unit tests for emailTemplates.ts
 */

import { Conference } from '@/types/conference';
import {
  generateEmailSubject,
  generateEmailTitle,
  generateEmailSubtitle,
  generateEnhancedEmailHTML,
  generatePlainTextEmail,
  EmailTemplateParams,
} from '@/lib/emailTemplates';

describe('Email Templates', () => {
  const mockConference: Conference = {
    id: 'test-1',
    name: 'Test Conference',
    url: 'https://testconf.com',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: {
      city: 'San Francisco',
      country: 'USA',
      raw: 'San Francisco, USA',
    },
    online: false,
    cfp: {
      url: 'https://testconf.com/cfp',
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open',
    },
    domain: 'software',
    source: 'test',
  };

  describe('generateEmailSubject', () => {
    it('should generate daily subject', () => {
      const subject = generateEmailSubject('daily', 5);
      expect(subject).toBe('Daily Conference Digest: 5 Upcoming Events');
    });

    it('should generate weekly subject', () => {
      const subject = generateEmailSubject('weekly', 10);
      expect(subject).toBe('Weekly Conference Digest: 10 Upcoming Events');
    });

    it('should handle zero conferences', () => {
      const subject = generateEmailSubject('daily', 0);
      expect(subject).toBe('Daily Conference Digest: 0 Upcoming Events');
    });
  });

  describe('generateEmailTitle', () => {
    it('should generate daily title', () => {
      const title = generateEmailTitle('daily');
      expect(title).toBe('Daily Conference Brief');
    });

    it('should generate weekly title', () => {
      const title = generateEmailTitle('weekly');
      expect(title).toBe('Weekly Conference Roundup');
    });
  });

  describe('generateEmailSubtitle', () => {
    it('should generate daily subtitle', () => {
      const subtitle = generateEmailSubtitle('daily');
      expect(subtitle).toContain('daily snapshot');
    });

    it('should generate weekly subtitle', () => {
      const subtitle = generateEmailSubtitle('weekly');
      expect(subtitle).toContain('weekly curated');
    });
  });

  describe('generateEnhancedEmailHTML', () => {
    const baseParams: EmailTemplateParams = {
      frequency: 'weekly',
      sections: [
        {
          title: 'Test Section',
          conferences: [mockConference],
          description: 'Test description',
        },
      ],
      unsubscribeUrl: 'https://test.confscouting.com/unsubscribe',
    };

    it('should generate valid HTML structure', () => {
      const html = generateEnhancedEmailHTML(baseParams);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include dynamic title based on frequency', () => {
      const html = generateEnhancedEmailHTML(baseParams);
      expect(html).toContain('Weekly Conference Roundup');
    });

    it('should include conference data in table', () => {
      const html = generateEnhancedEmailHTML(baseParams);
      expect(html).toContain('Test Conference');
      expect(html).toContain('https://testconf.com');
      expect(html).toContain('San Francisco, USA');
    });

    it('should include unsubscribe link', () => {
      const html = generateEnhancedEmailHTML(baseParams);
      expect(html).toContain('https://test.confscouting.com/unsubscribe');
    });

    it('should not contain any emojis', () => {
      const html = generateEnhancedEmailHTML(baseParams);
      // Common emoji ranges
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
      expect(html).not.toMatch(emojiRegex);
    });

    it('should handle empty sections gracefully', () => {
      const params: EmailTemplateParams = {
        ...baseParams,
        sections: [],
      };
      const html = generateEnhancedEmailHTML(params);
      expect(html).toContain('Weekly Conference Roundup');
    });

    it('should handle multiple sections', () => {
      const params: EmailTemplateParams = {
        ...baseParams,
        sections: [
          {
            title: 'Section 1',
            conferences: [mockConference],
            description: 'First section',
          },
          {
            title: 'Section 2',
            conferences: [{ ...mockConference, id: 'test-2', name: 'Second Conf' }],
            description: 'Second section',
          },
        ],
      };
      const html = generateEnhancedEmailHTML(params);
      expect(html).toContain('Section 1');
      expect(html).toContain('Section 2');
      expect(html).toContain('Second Conf');
    });

    it('should limit to 5 conferences per section', () => {
      const manyConfs = Array(10).fill(null).map((_, i) => ({
        ...mockConference,
        id: `test-${i}`,
        name: `Conf ${i}`,
      }));
      
      const params: EmailTemplateParams = {
        ...baseParams,
        sections: [{
          title: 'Many Conferences',
          conferences: manyConfs,
        }],
      };
      
      const html = generateEnhancedEmailHTML(params);
      // Should show "See more" link
      expect(html).toContain('See 5 more conferences');
    });

    it('should highlight urgent CFPs in red', () => {
      const urgentConf: Conference = {
        ...mockConference,
        cfp: {
          url: 'https://testconf.com/cfp',
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'open',
        },
      };
      
      const params: EmailTemplateParams = {
        ...baseParams,
        sections: [{
          title: 'Urgent Section',
          conferences: [urgentConf],
        }],
      };
      
      const html = generateEnhancedEmailHTML(params);
      expect(html).toContain('#dc2626'); // Red color for urgent
      expect(html).toContain('(URGENT)');
    });

    it('should use correct colors for non-urgent CFPs', () => {
      const params: EmailTemplateParams = {
        ...baseParams,
        sections: [{
          title: 'Normal Section',
          conferences: [mockConference],
        }],
      };
      
      const html = generateEnhancedEmailHTML(params);
      expect(html).toContain('#059669'); // Green color for normal
    });
  });

  describe('generatePlainTextEmail', () => {
    const baseParams: EmailTemplateParams = {
      frequency: 'daily',
      sections: [
        {
          title: 'Test Section',
          conferences: [mockConference],
          description: 'Test description',
        },
      ],
      unsubscribeUrl: 'https://test.confscouting.com/unsubscribe',
    };

    it('should generate plain text version', () => {
      const text = generatePlainTextEmail(baseParams);
      expect(text).toContain('Daily Conference Brief');
      expect(text).toContain('Test Conference');
      expect(text).toContain('https://testconf.com');
    });

    it('should not contain HTML tags', () => {
      const text = generatePlainTextEmail(baseParams);
      expect(text).not.toContain('<html');
      expect(text).not.toContain('<body');
      expect(text).not.toContain('<table');
    });

    it('should include unsubscribe link', () => {
      const text = generatePlainTextEmail(baseParams);
      expect(text).toContain('https://test.confscouting.com/unsubscribe');
    });

    it('should format dates properly', () => {
      const text = generatePlainTextEmail(baseParams);
      // Check that the date is formatted (should contain a comma like "Mar 8, 2026")
      expect(text).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
    });
  });
});
