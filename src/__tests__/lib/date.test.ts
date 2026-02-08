import { parseLocalDate, formatLocalDate, getLocalMonthYear } from '@/lib/date';

describe('date utility', () => {
  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD correctly', () => {
      const date = parseLocalDate('2026-02-08');
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(1); // February is 1
      expect(date?.getDate()).toBe(8);
    });

    it('should return null for invalid date', () => {
      expect(parseLocalDate('invalid')).toBe(null);
      expect(parseLocalDate('')).toBe(null);
    });
  });

  describe('formatLocalDate', () => {
    it('should format date correctly', () => {
      expect(formatLocalDate('2026-02-08')).toBe('Feb 8, 2026');
    });

    it('should return TBD for null/invalid input', () => {
      expect(formatLocalDate(null)).toBe('TBD');
      expect(formatLocalDate('invalid')).toBe('TBD');
    });
  });

  describe('getLocalMonthYear', () => {
    it('should return month and year', () => {
      expect(getLocalMonthYear('2026-02-08')).toBe('February 2026');
    });
  });
});
