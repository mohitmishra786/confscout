/**
 * Groq LLM service for generating high-quality email content
 * Uses Llama 3.3 70B for optimal quality and speed
 */

import Groq from 'groq-sdk';
import { Conference } from '@/types/conference';
import { formatDate } from '@/lib/emailTemplates';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://confscouting.com';

/**
 * System prompt for generating professional conference digest emails
 * Optimized for clarity, structure, and actionability
 */
const EMAIL_SYSTEM_PROMPT = `You are an expert email copywriter specializing in professional tech conference digests.
Your task is to create well-structured, scannable HTML email content for conference subscribers.

STRICT REQUIREMENTS:
1. NO emojis - use professional formatting only
2. Create clear sections with distinct headers
3. Maximum 5 items per section
4. Use HTML tables for conference listings
5. Include "See more" link after each section
6. Highlight urgent CFP deadlines
7. Prioritize local events when user location is known
8. Use professional, encouraging tone

SECTION STRUCTURE:
- Opening: Brief, friendly intro
- Section 1: "Happening Soon" (next 7 days) - most urgent
- Section 2: "CFP Deadlines This Week" - action required
- Section 3: "Notable Upcoming Events" (next 30 days) - worth considering
- Section 4: "Online Events" - accessible from anywhere
- Closing: Call to action and website link

TABLE FORMAT:
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr style="background:#f8f9fa;">
    <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;">Conference</th>
    <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;">Date</th>
    <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;">Location</th>
    <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;">CFP Closes</th>
  </tr>
  <!-- rows -->
</table>

ROW FORMAT:
<tr style="border-bottom:1px solid #e5e7eb;">
  <td style="padding:12px;"><strong><a href="URL">Name</a></strong></td>
  <td style="padding:12px;">Date</td>
  <td style="padding:12px;">Location</td>
  <td style="padding:12px;"><span style="color:#dc2626;font-weight:600;">CFP Date</span></td>
</tr>

OUTPUT ONLY VALID HTML - no markdown, no code blocks, no explanations.`;

export interface EmailSection {
  title: string;
  conferences: Conference[];
  description?: string;
}

export interface EmailContentInput {
  frequency: 'daily' | 'weekly';
  userLocation?: string;
  sections: EmailSection[];
  totalConferences: number;
}

/**
 * Generate email content using Groq LLM
 * @param input - Email content parameters
 * @returns Generated HTML content
 */
export async function generateEmailContent(input: EmailContentInput): Promise<string> {
  const { frequency, userLocation, sections, totalConferences } = input;
  
  const frequencyText = frequency === 'daily' ? 'Daily' : 'Weekly';
  const locationContext = userLocation ? `User is based in ${userLocation}. Prioritize nearby events.` : '';
  
  const userPrompt = `Create a ${frequencyText} conference digest email.

${locationContext}

Total conferences available: ${totalConferences}

SECTIONS TO INCLUDE:
${sections.map(s => `
${s.title} (${s.conferences.length} conferences):
${s.description || 'No description'}
Top 5 conferences:
${s.conferences.slice(0, 5).map(c => `- ${c.name}: ${c.startDate} in ${c.location?.raw || 'Online'}${c.cfp?.endDate ? `, CFP closes ${c.cfp.endDate}` : ''} (${c.url})`).join('\n')}
`).join('\n')}

REQUIREMENTS:
1. Generate professional HTML table for each section
2. Link conference names to their URLs
3. Add "See more conferences at ${APP_URL}/" after each section
4. Use color #dc2626 for urgent CFP dates (closing within 3 days)
5. Use color #059669 for upcoming events
6. Include a brief opening paragraph
7. Keep tone professional and encouraging`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: EMAIL_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }, {
      timeout: 30000, // 30 seconds timeout
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('Groq API returned empty content:', completion);
      throw new Error('Groq API returned empty response');
    }
    return content;
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to generate email content');
  }
}

/**
 * Categorize conferences into email sections
 * @param conferences - List of conferences
 * @returns Organized sections
 */
export function categorizeConferencesForEmail(conferences: Conference[]): EmailSection[] {
  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const sections: EmailSection[] = [];
  
  // Section 1: Happening Soon (next 7 days)
  const happeningSoon = conferences.filter(c => {
    const start = c.startDate ? new Date(c.startDate) : null;
    return start && start >= now && start <= oneWeek;
  }).slice(0, 5);
  
  if (happeningSoon.length > 0) {
    sections.push({
      title: 'Happening This Week',
      conferences: happeningSoon,
      description: 'Conferences starting in the next 7 days. Register now if you haven\'t already.',
    });
  }
  
  // Section 2: CFP Deadlines (closing in next 7 days)
  const cfpClosing = conferences.filter(c => {
    const cfpEnd = c.cfp?.endDate ? new Date(c.cfp.endDate) : null;
    return cfpEnd && cfpEnd >= now && cfpEnd <= oneWeek;
  }).sort((a, b) => {
    const aDate = a.cfp?.endDate ? new Date(a.cfp.endDate) : new Date(0);
    const bDate = b.cfp?.endDate ? new Date(b.cfp.endDate) : new Date(0);
    return aDate.getTime() - bDate.getTime();
  }).slice(0, 5);
  
  if (cfpClosing.length > 0) {
    sections.push({
      title: 'CFP Deadlines This Week',
      conferences: cfpClosing,
      description: 'Submit your talk proposals before these deadlines pass.',
    });
  }
  
  // Section 3: Notable Upcoming (next 30 days, excluding those in section 1)
  const upcoming = conferences.filter(c => {
    const start = c.startDate ? new Date(c.startDate) : null;
    const alreadyListed = happeningSoon.find(h => h.id === c.id);
    return start && start > oneWeek && start <= oneMonth && !alreadyListed;
  }).slice(0, 5);
  
  if (upcoming.length > 0) {
    sections.push({
      title: 'Notable Upcoming Events',
      conferences: upcoming,
      description: 'Worth marking on your calendar for the coming month.',
    });
  }
  
  // Section 4: Online Events (excluding all already listed conferences)
  const onlineEvents = conferences.filter(c => {
    const alreadyListed = [...happeningSoon, ...cfpClosing, ...upcoming].find(listed => listed.id === c.id);
    return c.online && !alreadyListed;
  }).slice(0, 5);
  
  if (onlineEvents.length > 0) {
    sections.push({
      title: 'Online Events',
      conferences: onlineEvents,
      description: 'Attend from anywhere in the world.',
    });
  }
  
  return sections;
}

/**
 * Fallback HTML generator when Groq API fails
 * @param sections - Email sections
 * @param frequency - Email frequency
 * @returns Basic HTML content
 */
export function generateFallbackEmailContent(
  sections: EmailSection[],
  frequency: 'daily' | 'weekly'
): string {
  const frequencyText = frequency === 'daily' ? 'Daily' : 'Weekly';
  
  const sectionHtml = sections.map(section => {
    const rows = section.conferences.map(c => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;">
          <strong><a href="${c.url}" style="color:#2563eb;text-decoration:none;">${c.name}</a></strong>
        </td>
        <td style="padding:12px;">${formatDate(c.startDate)}</td>
        <td style="padding:12px;">${c.location?.raw || 'Online'}</td>
        <td style="padding:12px;">
          ${c.cfp?.endDate ? `<span style="color:#dc2626;font-weight:600;">${formatDate(c.cfp.endDate)}</span>` : '-'}
        </td>
      </tr>
    `).join('');
    
    return `
      <div style="margin:24px 0;">
        <h2 style="color:#111827;font-size:20px;margin-bottom:8px;">${section.title}</h2>
        ${section.description ? `<p style="color:#6b7280;margin-bottom:16px;">${section.description}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;">Conference</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;">Date</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;">Location</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;">CFP Closes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:12px;text-align:right;">
          <a href="${APP_URL}/" style="color:#2563eb;text-decoration:none;font-size:14px;">See more conferences</a>
        </p>
      </div>
    `;
  }).join('');
  
  return `
    <p>Here is your ${frequencyText.toLowerCase()} conference digest with the latest opportunities.</p>
    ${sectionHtml}
  `;
}
