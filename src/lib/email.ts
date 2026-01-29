import nodemailer from 'nodemailer';
import { Conference } from '@/types/conference';

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.in',
  port: parseInt(process.env.ZOHO_SMTP_PORT || '587'),
  secure: parseInt(process.env.ZOHO_SMTP_PORT || '587') === 465, // true for 465, false for other ports
  auth: {
    user: process.env.ZOHO_USER || process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://confscout.site';

// Note: sendVerificationEmail was removed - verification is no longer used

export async function sendWelcomeEmail(to: string, token: string, frequency: string = 'weekly', domain: string = 'all') {
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`;

  const frequencyText = frequency.charAt(0).toUpperCase() + frequency.slice(1);
  const domainText = domain === 'all' ? 'All Tech Domains' : domain;

  await transporter.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_USER || process.env.ZOHO_EMAIL}>`,
    to,
    subject: `Subscription Confirmed: ${frequencyText} Updates 🚀`,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
    },
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #000;">Welcome to ConfScout!</h1>
          <p>You have successfully subscribed to ConfScout updates.</p>
          
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Your Preferences:</p>
            <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #555;">
              <li>Frequency: <strong>${frequencyText}</strong></li>
              <li>Focus Area: <strong>${domainText}</strong></li>
            </ul>
          </div>

          <p>You will receive curated summaries of upcoming conferences and CFP deadlines directly to your inbox.</p>
          
          <p>Stay tuned!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">
            <a href="${unsubscribeUrl}" style="color: #888; text-decoration: underline;">Unsubscribe</a> from these updates at any time.
          </p>
        </div>
      `,
  });
}

export async function sendUnsubscribeEmail(to: string) {
  await transporter.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_USER || process.env.ZOHO_EMAIL}>`,
    to,
    subject: 'You have been unsubscribed',
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Unsubscribe Confirmed</h1>
          <p>You have been successfully removed from the ConfScout mailing list.</p>
          <p>We're sorry to see you go! If you change your mind, you can always resubscribe at <a href="${APP_URL}">confscout.site</a>.</p>
        </div>
      `,
  });
}

export async function sendDigestEmail(to: string, token: string, conferences: Conference[]) {
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`;

  // Simple list format for now
  const confList = conferences.map((c) => `
      <div style="margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
        <h3 style="margin: 0 0 4px 0;"><a href="${c.url}" style="color: #2563eb; text-decoration: none;">${c.name}</a></h3>
        <p style="margin: 0; color: #666; font-size: 14px;">${c.startDate} • ${c.location?.raw || 'Online'}</p>
        ${c.cfp?.status === 'open' ? `<p style="margin: 4px 0 0 0; color: #059669; font-size: 12px; font-weight: bold;">🟢 CFP Closing: ${c.cfp?.endDate}</p>` : ''}
      </div>
    `).join('');

  console.log(`[Email] Sending digest to ${to} with ${conferences.length} conferences`);
  
  if (!process.env.ZOHO_PASSWORD) {
    console.log('[Email] Mock send (no credentials):', { to, subject: `Upcoming Conferences Digest` });
    return;
  }

  await transporter.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_USER || process.env.ZOHO_EMAIL}>`,
    to,
    subject: `Upcoming Conferences Digest`,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
    },
    html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h1 style="color: #000;">Weekly Scout Report</h1>
                <p>Here are the upcoming conferences you shouldn't miss:</p>
                
                <div style="margin-top: 20px;">
                    ${confList}
                </div>
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="${APP_URL}" style="background: #111; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 14px;">View on Map</a>
                </div>

                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 12px; color: #888; text-align: center;">
                    You are receiving this because you subscribed to ConfScout.
                    <br/>
                    <a href="${unsubscribeUrl}" style="color: #888; text-decoration: underline;">Unsubscribe</a>
                </p>
            </div>
        `,
  });
}
