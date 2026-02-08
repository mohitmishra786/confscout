import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateCsrfToken } from '@/lib/csrf';
import { withErrorHandling, Errors } from '@/lib/errorHandler';
import { bodySchemas } from '@/lib/apiSchemas';
import { ApiResponse } from '@/types/api';

export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!await validateCsrfToken(request)) {
    throw Errors.forbidden('Invalid CSRF token');
  }

  const body = await request.json();
  const validated = bodySchemas.conferenceSubmission.parse(body);

  // Insert submission into database with ON CONFLICT handling
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO conference_submissions (
        name, url, start_date, end_date, city, country, online, domain,
        cfp_url, cfp_end_date, has_financial_aid, financial_aid_types,
        description, tags, organizer_name, organizer_email, submission_type,
        additional_notes, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending', NOW())
      ON CONFLICT (url) WHERE status = 'pending' DO NOTHING
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

    // Check if the insertion was successful (no conflict)
    if (result.rows.length === 0) {
      throw Errors.conflict('This conference URL already has a pending submission');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        submissionId: result.rows[0].id,
      },
      message: 'Conference submitted successfully. We will review it and add it to the database within 24-48 hours.',
      meta: { timestamp: new Date().toISOString() }
    };

    return NextResponse.json(response, { status: 201 });

  } finally {
    client.release();
  }
});
