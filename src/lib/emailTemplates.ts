/**
 * Enhanced email templates with professional HTML formatting
 * No emojis, clean table layouts, dynamic titles
 */

import { Conference } from '@/types/conference';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://confscouting.com';

/**
 * Generate dynamic email subject based on frequency
 * @param frequency - 'daily' or 'weekly'
 * @param conferenceCount - Number of conferences in the email
 * @returns Formatted subject line
 */
export function generateEmailSubject(
  frequency: 'daily' | 'weekly',
  conferenceCount: number
): string {
  const frequencyText = frequency === 'daily' ? 'Daily' : 'Weekly';
  return `${frequencyText} Conference Digest: ${conferenceCount} Upcoming Events`;
}

/**
 * Generate dynamic title based on frequency
 * @param frequency - 'daily' or 'weekly'
 * @returns Formatted title
 */
export function generateEmailTitle(frequency: 'daily' | 'weekly'): string {
  if (frequency === 'daily') {
    return 'Daily Conference Brief';
  }
  return 'Weekly Conference Roundup';
}

/**
 * Generate subtitle based on frequency
 * @param frequency - 'daily' or 'weekly'
 * @returns Formatted subtitle
 */
export function generateEmailSubtitle(frequency: 'daily' | 'weekly'): string {
  if (frequency === 'daily') {
    return 'Your daily snapshot of upcoming tech conferences and CFP deadlines.';
  }
  return 'Your weekly curated list of tech conferences and speaking opportunities.';
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if CFP is urgent (closing within 3 days)
 * @param endDate - CFP end date
 * @returns True if urgent
 */
function isUrgentCFP(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  const cfpDate = new Date(endDate);
  const now = new Date();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return cfpDate.getTime() - now.getTime() <= threeDays && cfpDate >= now;
}

/**
 * Generate HTML table row for a conference
 * @param conference - Conference data
 * @returns HTML table row
 */
function generateConferenceRow(conference: Conference): string {
  const cfpEnd = conference.cfp?.endDate;
  const cfpUrgent = isUrgentCFP(cfpEnd);
  
  return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:16px 12px;vertical-align:top;">
        <strong>
          <a href="${conference.url}" 
             style="color:#2563eb;text-decoration:none;font-size:15px;"
             target="_blank">
            ${conference.name}
          </a>
        </strong>
        ${conference.description ? `<p style="margin:4px 0 0 0;color:#6b7280;font-size:13px;">${conference.description.substring(0, 100)}${conference.description.length > 100 ? '...' : ''}</p>` : ''}
      </td>
      <td style="padding:16px 12px;vertical-align:top;white-space:nowrap;color:#374151;font-size:14px;">
        ${formatDate(conference.startDate)}
      </td>
      <td style="padding:16px 12px;vertical-align:top;color:#374151;font-size:14px;">
        ${conference.location?.raw || (conference.online ? 'Online' : 'TBA')}
      </td>
      <td style="padding:16px 12px;vertical-align:top;white-space:nowrap;font-size:14px;">
        ${cfpEnd 
          ? `<span style="color:${cfpUrgent ? '#dc2626' : '#059669'};font-weight:600;">${formatDate(cfpEnd)}</span>${cfpUrgent ? ' <span style="color:#dc2626;font-size:12px;">(URGENT)</span>' : ''}`
          : '<span style="color:#9ca3af;">Closed</span>'
        }
      </td>
    </tr>
  `;
}

/**
 * Generate HTML section for a group of conferences
 * @param title - Section title
 * @param conferences - List of conferences
 * @param description - Optional section description
 * @param maxItems - Maximum items to show (default 5)
 * @returns HTML section
 */
function generateSectionHTML(
  title: string,
  conferences: Conference[],
  description?: string,
  maxItems: number = 5
): string {
  if (conferences.length === 0) return '';
  
  const displayConferences = conferences.slice(0, maxItems);
  const hasMore = conferences.length > maxItems;
  const rows = displayConferences.map(generateConferenceRow).join('');
  
  return `
    <div style="margin:32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-left:4px solid #2563eb;padding-left:16px;">
            <h2 style="margin:0 0 4px 0;color:#111827;font-size:22px;font-weight:700;">${title}</h2>
            ${description ? `<p style="margin:0;color:#6b7280;font-size:14px;">${description}</p>` : ''}
          </td>
        </tr>
      </table>
      
      <table style="width:100%;border-collapse:collapse;margin-top:16px;background:#ffffff;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;width:45%;">Conference</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;width:20%;">Date</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;width:20%;">Location</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151;font-size:13px;width:15%;">CFP Closes</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      
      ${hasMore ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
          <tr>
            <td align="right">
              <a href="${APP_URL}" 
                 style="color:#2563eb;text-decoration:none;font-size:14px;font-weight:500;"
                 target="_blank">
                See ${conferences.length - maxItems} more conferences
              </a>
            </td>
          </tr>
        </table>
      ` : ''}
    </div>
  `;
}

/**
 * Generate the complete HTML email template
 * @param params - Email parameters
 * @returns Complete HTML email
 */
export interface EmailTemplateParams {
  frequency: 'daily' | 'weekly';
  sections: Array<{
    title: string;
    conferences: Conference[];
    description?: string;
  }>;
  unsubscribeUrl: string;
}

export function generateEnhancedEmailHTML(params: EmailTemplateParams): string {
  const { frequency, sections, unsubscribeUrl } = params;
  
  const title = generateEmailTitle(frequency);
  const subtitle = generateEmailSubtitle(frequency);
  
  const sectionsHTML = sections
    .filter(s => s.conferences.length > 0)
    .map(s => generateSectionHTML(s.title, s.conferences, s.description))
    .join('');
  
  const totalConferences = sections.reduce((sum, s) => sum + s.conferences.length, 0);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px !important; }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table class="container" width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:40px 40px 32px 40px;border-radius:8px 8px 0 0;text-align:center;">
              <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">${title}</h1>
              <p style="margin:0;color:#dbeafe;font-size:16px;">${subtitle}</p>
              <p style="margin:16px 0 0 0;color:#bfdbfe;font-size:14px;">${totalConferences} events curated for you</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="padding:40px;">
              
              <!-- Intro -->
              <p style="margin:0 0 24px 0;color:#374151;font-size:16px;line-height:1.6;">
                Stay ahead in your field with this curated selection of upcoming tech conferences and call for proposals. 
                Each event is handpicked to help you grow your network and share your expertise.
              </p>
              
              ${sectionsHTML}
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#111827;border-radius:6px;text-align:center;">
                          <a href="${APP_URL}" 
                             style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;"
                             target="_blank">
                            Explore All Conferences
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:32px 40px;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#6b7280;font-size:14px;">
                You are receiving this because you subscribed to ConfScout updates.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:13px;">
                <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> from these updates
                <span style="margin:0 8px;">|</span>
                <a href="${APP_URL}" style="color:#6b7280;text-decoration:underline;">Visit ConfScout</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text version of the email for clients that don't support HTML
 * @param params - Email parameters
 * @returns Plain text email
 */
export function generatePlainTextEmail(params: EmailTemplateParams): string {
  const { frequency, sections, unsubscribeUrl } = params;
  
  const title = generateEmailTitle(frequency);
  let text = `${title}\n${'='.repeat(title.length)}\n\n`;
  
  sections.forEach(section => {
    if (section.conferences.length === 0) return;
    
    text += `\n${section.title}\n${'-'.repeat(section.title.length)}\n`;
    if (section.description) {
      text += `${section.description}\n\n`;
    }
    
    section.conferences.slice(0, 5).forEach(c => {
      text += `* ${c.name}\n`;
      text += `  Date: ${formatDate(c.startDate)}\n`;
      text += `  Location: ${c.location?.raw || (c.online ? 'Online' : 'TBA')}\n`;
      if (c.cfp?.endDate) {
        text += `  CFP Closes: ${formatDate(c.cfp.endDate)}\n`;
      }
      text += `  Link: ${c.url}\n\n`;
    });
    
    if (section.conferences.length > 5) {
      text += `See ${section.conferences.length - 5} more at: ${APP_URL}\n`;
    }
  });
  
  text += `\n\nView all conferences: ${APP_URL}\n\n`;
  text += `Unsubscribe: ${unsubscribeUrl}\n`;
  
  return text;
}
