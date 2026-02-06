import nodemailer from 'nodemailer';
import { Conference } from '@/types/conference';
import {
  generateEmailSubject,
  generatePlainTextEmail,
} from '@/lib/emailTemplates';
import { generateEmailContent, categorizeConferencesForEmail, generateFallbackEmailContent } from '@/lib/groqEmail';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://confscouting.com';

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_HOST || 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASSWORD,
  },
});

/**
 * Send welcome email to new subscriber
 */
export async function sendWelcomeEmail(to: string, token: string) {
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
  
  await transporter.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_USER || process.env.ZOHO_EMAIL}>`,
    to,
    subject: 'Welcome to ConfScout!',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <h1 style="color:#1e40af;">Welcome to ConfScout!</h1>
        <p>Thanks for subscribing! You'll receive regular updates on the best tech conferences and CFP deadlines.</p>
        <div style="margin:30px 0;text-align:center;">
          <a href="${APP_URL}" style="background:#111827;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Explore Conferences</a>
        </div>
        <p style="color:#6b7280;font-size:12px;margin-top:40px;">
          If you didn't mean to subscribe, you can <a href="${unsubscribeUrl}">unsubscribe here</a>.
        </p>
      </div>
    `,
  });
}

/**
 * Wrap Groq-generated content in our email template structure
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
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table class="container" width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:40px 40px 32px 40px;border-radius:8px 8px 0 0;text-align:center;">
              <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:28px;font-weight:700;">${title}</h1>
              <p style="margin:0;color:#dbeafe;font-size:16px;">${subtitle}</p>
              <p style="margin:16px 0 0 0;color:#bfdbfe;font-size:14px;">${totalConferences} events curated for you</p>
            </td>
          </tr>
          <tr>
            <td class="content" style="padding:40px;">
              ${groqContent}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Explore All Conferences</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:32px 40px;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#6b7280;font-size:14px;">You are receiving this because you subscribed to ConfScout updates.</p>
              <p style="margin:0;color:#9ca3af;font-size:13px;">
                <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> | 
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
 * Redact PII from email for logging
 */
function maskEmail(email: string): string {
  if (!email) return 'unknown';
  const [local, domain] = email.split('@');
  if (!domain) return email.substring(0, 3) + '...';
  const maskedLocal = local.length > 2 
    ? `${local.charAt(0)}***${local.charAt(local.length - 1)}` 
    : `${local.charAt(0)}***`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Sanitize Groq AI content before interpolation into HTML
 * Uses an allowlist-based approach for safe email elements
 */
function sanitizeGroqContent(content: string): string {
  if (!content) return '';
  
  const allowedTags = [
    'table', 'tr', 'td', 'th', 'thead', 'tbody', 'a', 'p', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 
    'img', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li'
  ];
  const allowedAttrs = ['style', 'href', 'src', 'alt', 'width', 'height', 'target', 'rel'];
  
  // 1. Strip all meta, script, style (the tag itself), iframe, etc.
  let sanitized = content.replace(/<(script|iframe|meta|base|svg|object|embed|math|form|style|button|textarea|select)\b[\s\S]*?<\/\1\s*>/gi, '');
  sanitized = sanitized.replace(/<(script|iframe|meta|base|svg|object|embed|math|form|style|button|textarea|select)\b[\s\S]*?>/gi, '');

  // 2. Filter tags and attributes
  sanitized = sanitized.replace(/<(\/?)(\w+)([^>]*)>/gi, (match, slash, tag, attrs) => {
    const tagName = tag.toLowerCase();
    if (!allowedTags.includes(tagName)) {
      return ''; // Strip non-allowed tag
    }
    
    // Filter attributes
    const sanitizedAttrs = attrs.replace(/(\w+)\s*=\s*(?:"([^"]*)"|'[^']*'|([^\s>]+))/gi, (attrMatch: string, attrName: string, dQuote: string, sQuote: string, unquoted: string) => {
      const name = attrName.toLowerCase();
      const value = (dQuote || sQuote || unquoted || '').trim();
      
      if (!allowedAttrs.includes(name) || name.startsWith('on')) {
        return ''; // Strip non-allowed or event handlers
      }
      
      // Normalize URLs
      if (name === 'href' || name === 'src') {
        const lowerVal = value.toLowerCase();
        if (lowerVal.startsWith('javascript:') || lowerVal.startsWith('data:') || lowerVal.startsWith('vbscript:')) {
          return `${name}="#"`;
        }
      }
      
      return ` ${name}="${value.replace(/"/g, '&quot;')}"`;
    });
    
    return `<${slash}${tagName}${sanitizedAttrs}>`;
  });

  return sanitized;
}

/**
 * Send a digest email to a subscriber
 */
export async function sendDigestEmail(
  to: string,
  token: string,
  conferences: Conference[],
  frequency: 'daily' | 'weekly' = 'weekly',
  userLocation?: string,
  useGroq: boolean = true
): Promise<void> {
  try {
    const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`;
    const sections = categorizeConferencesForEmail(conferences);
    let htmlContent: string;
    let textContent: string;

    if (useGroq && process.env.GROQ_API_KEY) {
      try {
        const groqContent = await generateEmailContent({
          frequency,
          userLocation,
          sections,
          totalConferences: conferences.length
        });
        
        // Sanitize AI content before using it in the template
        const safeGroqContent = sanitizeGroqContent(groqContent);
        
        htmlContent = wrapGroqContent(safeGroqContent, frequency, unsubscribeUrl, conferences.length);
        textContent = groqContent.replace(/<[^>]*>/g, '');
      } catch (error) {
        console.error('Groq email generation failed, falling back to template:', error);
        htmlContent = generateFallbackEmailContent(sections, frequency);
        textContent = generatePlainTextEmail({ frequency, sections, unsubscribeUrl });
      }
    } else {
      htmlContent = generateFallbackEmailContent(sections, frequency);
      textContent = generatePlainTextEmail({ frequency, sections, unsubscribeUrl });
    }

    await transporter.sendMail({
      from: `"ConfScout" <${process.env.ZOHO_USER}>`,
      to,
      subject: generateEmailSubject(frequency, conferences.length),
      html: htmlContent,
      text: textContent,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
      },
    });
  } catch (error) {
    console.error(`Failed to send digest email to ${maskEmail(to)}:`, error);
    throw error;
  }
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
 * Legacy function for backward compatibility
 */
export async function sendDigestEmailLegacy(
  to: string,
  token: string,
  conferences: Conference[]
) {
  return sendDigestEmail(to, token, conferences, 'weekly');
}

export { categorizeConferencesForEmail };
