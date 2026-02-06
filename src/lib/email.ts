/**
 * Email service with enhanced templates and Groq AI integration
 * Supports dynamic titles, professional HTML formatting, and categorized sections
 */

import nodemailer from 'nodemailer';
import { Conference } from '@/types/conference';
import {
  generateEmailSubject,
  EmailTemplateParams,
  generateEnhancedEmailHTML,
  generatePlainTextEmail,
} from '@/lib/emailTemplates';
import { generateEmailContent, categorizeConferencesForEmail } from '@/lib/groqEmail';

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.in',
  port: parseInt(process.env.ZOHO_SMTP_PORT || '587'),
  secure: parseInt(process.env.ZOHO_SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.ZOHO_USER || process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://confscouting.com';

/**
 * Send welcome email to new subscribers
 * @param to - Recipient email
 * @param token - Verification/unsubscribe token
 * @param frequency - Subscription frequency
 * @param domain - Preferred domain
 */
export async function sendWelcomeEmail(
  to: string,
  token: string,
  frequency: string = 'weekly',
  domain: string = 'all'
) {
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`;

  const frequencyText = frequency.charAt(0).toUpperCase() + frequency.slice(1);
  const domainText = domain === 'all' ? 'All Tech Domains' : domain;

  await transporter.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_USER || process.env.ZOHO_EMAIL}>`,
    to,
    subject: `Subscription Confirmed: ${frequencyText} Updates`,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
    },
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ConfScout</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:40px;text-align:center;border-radius:8px 8px 0 0;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Welcome to ConfScout</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <p style="margin:0 0 24px 0;color:#374151;font-size:16px;line-height:1.6;">
                      You have successfully subscribed to ConfScout updates. Get ready to discover amazing tech conferences and speaking opportunities.
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:8px;margin:24px 0;">
                      <tr>
                        <td style="padding:24px;">
                          <h2 style="margin:0 0 16px 0;color:#111827;font-size:18px;font-weight:600;">Your Preferences</h2>
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:4px 0;color:#6b7280;font-size:14px;width:100px;">Frequency:</td>
                              <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:600;">${frequencyText}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;color:#6b7280;font-size:14px;">Focus:</td>
                              <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:600;">${domainText}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin:24px 0 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                      You will receive curated summaries of upcoming conferences and CFP deadlines directly to your inbox.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
                    <p style="margin:0;color:#9ca3af;font-size:13px;">
                      <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> from these updates at any time.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

/**
 * Send unsubscribe confirmation email
 * @param to - Recipient email
 */
export async function sendUnsubscribeEmail(to: string, token: string) {
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
  
  await transporter.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_USER || process.env.ZOHO_EMAIL}>`,
    to,
    subject: 'You have been unsubscribed',
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
    },
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribe Confirmed</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding:40px;text-align:center;">
                    <h1 style="margin:0 0 16px 0;color:#111827;font-size:24px;font-weight:700;">Unsubscribe Confirmed</h1>
                    <p style="margin:0 0 24px 0;color:#6b7280;font-size:16px;line-height:1.6;">
                      You have been successfully removed from the ConfScout mailing list.
                    </p>
                    <p style="margin:0;color:#9ca3af;font-size:14px;">
                      We're sorry to see you go! If you change your mind, you can always resubscribe at 
                      <a href="${APP_URL}" style="color:#2563eb;text-decoration:none;">confscouting.com</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

/**
 * Send digest email with enhanced formatting and Groq AI-generated content
 * @param to - Recipient email
 * @param token - Unsubscribe token
 * @param conferences - List of conferences to include
 * @param frequency - 'daily' or 'weekly'
 * @param userLocation - Optional user location for prioritization
 * @param useGroq - Whether to use Groq AI for content generation (default: true)
 */
export async function sendDigestEmail(
  to: string,
  token: string,
  conferences: Conference[],
  frequency: 'daily' | 'weekly' = 'weekly',
  userLocation?: string,
  useGroq: boolean = true
) {
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`;

  // Log email send attempt with redacted email
  const redactedTo = to.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => `${a}***${c}`);
  console.log(`[Email] Sending digest to ${redactedTo} with ${conferences.length} conferences`);

  // Check for email credentials
  if (!process.env.ZOHO_PASSWORD) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ZOHO_PASSWORD is missing in production environment');
    }
    console.log('[Email] Mock send (no credentials):', { to: redactedTo, subject: `Upcoming Conferences Digest` });
    return;
  }

  // Categorize conferences into sections
  const sections = categorizeConferencesForEmail(conferences);

  // Generate subject line
  const subject = generateEmailSubject(frequency, conferences.length);

  let html: string;
  let text: string;

  if (useGroq && process.env.GROQ_API_KEY) {
    try {
      // Try to generate enhanced content with Groq
      const groqContent = await generateEmailContent({
        frequency,
        userLocation,
        sections,
        totalConferences: conferences.length,
      });

      // Wrap Groq content in our template structure
      html = wrapGroqContent(groqContent, frequency, unsubscribeUrl, conferences.length);
      text = generatePlainTextEmail({ frequency, sections, unsubscribeUrl });
    } catch (error) {
      console.warn('Groq content generation failed, using fallback:', error);
      // Fallback to template-based generation
      const params: EmailTemplateParams = { frequency, sections, unsubscribeUrl };
      html = generateEnhancedEmailHTML(params);
      text = generatePlainTextEmail(params);
    }
  } else {
    // Use template-based generation
    const params: EmailTemplateParams = { frequency, sections, unsubscribeUrl };
    html = generateEnhancedEmailHTML(params);
    text = generatePlainTextEmail(params);
  }

  await transporter.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_USER || process.env.ZOHO_EMAIL}>`,
    to,
    subject,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
    },
    html,
    text,
  });
  
  return { sent: true, subject, sectionsCount: sections.length };
}

/**
 * Wrap Groq-generated content in our email template structure
 * @param groqContent - HTML content from Groq
 * @param frequency - Email frequency
 * @param unsubscribeUrl - Unsubscribe URL
 * @param totalConferences - Total conference count
 * @returns Complete HTML email
 */
function wrapGroqContent(
  groqContent: string,
  frequency: 'daily' | 'weekly',
  unsubscribeUrl: string,
  totalConferences: number
): string {
  const title = frequency === 'daily' ? 'Daily Conference Brief' : 'Weekly Conference Roundup';
  const subtitle = frequency === 'daily' 
    ? 'Your daily snapshot of upcoming tech conferences and CFP deadlines.' 
    : 'Your weekly curated list of tech conferences and speaking opportunities.';
  
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
              ${groqContent}
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#111827;border-radius:6px;text-align:center;">
                          <a href="${APP_URL}" 
                             style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;"
                             target="_blank"
                             rel="noopener noreferrer">
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
 * Legacy function for backward compatibility
 * @deprecated Use sendDigestEmail with frequency parameter instead
 */
export async function sendDigestEmailLegacy(
  to: string,
  token: string,
  conferences: Conference[]
) {
  return sendDigestEmail(to, token, conferences, 'weekly');
}

// Re-export categorization function for use in other modules
export { categorizeConferencesForEmail };
