import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';

const conferenceSubmissionSchema = z.object({
  name: z.string().min(2, 'Conference name must be at least 2 characters'),
  url: z.string().url('Invalid URL format'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  online: z.boolean().default(false),
  domain: z.string().min(1, 'Domain is required'),
  cfpUrl: z.string().url('Invalid CFP URL').optional(),
  cfpEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid CFP date format').optional(),
  hasFinancialAid: z.boolean().default(false),
  financialAidTypes: z.array(z.string()).optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  tags: z.array(z.string()).optional(),
  organizerName: z.string().min(2, 'Organizer name is required'),
  organizerEmail: z.string().email('Invalid email format'),
  submissionType: z.enum(['update', 'new']).default('new'),
  additionalNotes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate submission
    const validated = conferenceSubmissionSchema.parse(body);

    // Check for duplicate submissions
    const client = await pool.connect();
    try {
      const duplicateCheck = await client.query(
        'SELECT id FROM conference_submissions WHERE url = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [validated.url, 'pending']
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'This conference URL already has a pending submission' },
          { status: 409 }
        );
      }

      // Insert submission into database
      const result = await client.query(
        `INSERT INTO conference_submissions (
          name, url, start_date, end_date, city, country, online, domain,
          cfp_url, cfp_end_date, has_financial_aid, financial_aid_types,
          description, tags, organizer_name, organizer_email, submission_type,
          additional_notes, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending', NOW())
        RETURNING id`,
        [
          validated.name,
          validated.url,
          validated.startDate,
          validated.endDate || null,
          validated.city,
          validated.country,
          validated.online,
          validated.domain,
          validated.cfpUrl || null,
          validated.cfpEndDate || null,
          validated.hasFinancialAid,
          validated.financialAidTypes || [],
          validated.description || null,
          validated.tags || [],
          validated.organizerName,
          validated.organizerEmail,
          validated.submissionType,
          validated.additionalNotes || null,
        ]
      );

      return NextResponse.json({
        success: true,
        submissionId: result.rows[0].id,
        message: 'Conference submitted successfully. We will review it and add it to the database within 24-48 hours.',
      }, { status: 201 });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Conference submission error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}