import { NextResponse } from 'next/server';

export async function GET() {
  const docs = {
    title: 'ConfScout API Documentation',
    version: 'v1',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://confscout.site',
    endpoints: [
      {
        path: '/api/v1/conferences',
        method: 'GET',
        description: 'Get all conferences with optional filters',
        parameters: [
          { name: 'domain', type: 'string', description: 'Filter by domain (ai, web, security, etc.)', required: false },
          { name: 'cfp_open', type: 'boolean', description: 'Only show conferences with open CFPs', required: false },
          { name: 'format', type: 'string', description: 'Response format: json or csv', required: false }
        ],
        example: '/api/v1/conferences?domain=ai&cfp_open=true&format=json'
      },
      {
        path: '/api/conferences',
        method: 'GET',
        description: 'Get conferences grouped by month (legacy endpoint)',
        parameters: [
          { name: 'domain', type: 'string', description: 'Filter by domain', required: false },
          { name: 'cfpOpen', type: 'boolean', description: 'Only show open CFPs', required: false }
        ]
      },
      {
        path: '/api/subscribe',
        method: 'POST',
        description: 'Subscribe to conference updates',
        body: {
          email: 'string (required)',
          frequency: 'string (daily|weekly)',
          domain: 'string (optional)'
        }
      },
      {
        path: '/api/submit-conference',
        method: 'POST',
        description: 'Submit a new conference for review',
        body: {
          name: 'string (required)',
          url: 'string (required)',
          startDate: 'string (YYYY-MM-DD)',
          domain: 'string (required)',
          city: 'string (required)',
          country: 'string (required)'
        }
      }
    ],
    responseCodes: {
      200: 'Success',
      400: 'Bad Request - Invalid parameters',
      404: 'Not Found',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error'
    },
    rateLimit: {
      requests: 100,
      per: 'minute'
    }
  };

  return NextResponse.json(docs);
}