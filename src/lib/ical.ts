import type { Conference } from '@/types/conference';

export function generateICalEvent(conference: Conference): string {
  const startDate = conference.startDate ? conference.startDate.replace(/-/g, '') : '';
  const endDate = conference.endDate ? conference.endDate.replace(/-/g, '') : startDate;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ConfScout//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${conference.name}`,
    `DESCRIPTION:${conference.description || ''}`,
    `URL:${conference.url}`,
    `LOCATION:${conference.location?.raw || 'Online'}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function generateICalDownload(conferences: Conference[]): string {
  const events = conferences.map(generateICalEvent).join('\r\n');
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ConfScout//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR'
  ].join('\r\n');
}