/**
 * Date utility for consistent date handling across the app
 */

/**
 * Parses a YYYY-MM-DD string into a Date object without timezone shifts.
 * This ensures that '2026-02-08' is always treated as Feb 8, 2026, regardless of user's timezone.
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Split by hyphen to avoid timezone-aware parsing
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Note: month is 0-indexed in JS Date constructor
  const date = new Date(year, month - 1, day);
  
  // Check if it's a valid date
  if (isNaN(date.getTime())) return null;
  
  return date;
}

/**
 * Formats a YYYY-MM-DD string into a readable format without timezone shifts
 */
export function formatLocalDate(dateStr: string | null, options: Intl.DateTimeFormatOptions = {}): string {
  if (!dateStr) return 'TBD';
  
  const date = parseLocalDate(dateStr);
  if (!date) return 'TBD';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Returns the month and year string from a YYYY-MM-DD string
 */
export function getLocalMonthYear(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  
  const date = parseLocalDate(dateStr);
  if (!date) return 'TBD';
  
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
