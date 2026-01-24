import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: 'smtppro.zoho.in',
  port: 587,
  secure: false, // upgrades later with STARTTLS
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://confscout.site'}/api/verify?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #3B82F6;">Confirm your subscription</h2>
      <p>Thanks for subscribing to ConfScout updates.</p>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verifyUrl}" style="display: inline-block; background: #3B82F6; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px;">Verify Email</a>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  await transport.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_EMAIL}>`,
    to,
    subject: 'Verify your ConfScout subscription',
    html,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendDigestEmail(to: string, conferences: any[]) {
  // Simple list format for now
  const confList = conferences.map(c => `
    <div style="margin-bottom: 16px; border-bottom: 1px solid #333; padding-bottom: 16px;">
      <h3 style="margin: 0; color: #fff;">${c.name}</h3>
      <p style="margin: 4px 0; color: #ccc;">${c.startDate} | ${c.location.raw}</p>
      <a href="${c.url}" style="color: #3B82F6;">View Event</a>
    </div>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #3B82F6;">Weekly Conference Digest</h2>
      <p>Here are the latest conferences added this week:</p>
      ${confList}
      <p style="margin-top: 20px; color: #666; font-size: 12px;">You are receiving this because you subscribed to ConfScout updates.</p>
    </div>
  `;

  await transport.sendMail({
    from: `"ConfScout" <${process.env.ZOHO_EMAIL}>`,
    to,
    subject: 'Your Weekly Conference Digest',
    html,
  });
}
