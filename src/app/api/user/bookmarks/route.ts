import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCsrfToken } from '@/lib/csrf';
import { withErrorHandling, Errors } from '@/lib/errorHandler';
import { querySchemas, bodySchemas } from '@/lib/apiSchemas';
import { ApiResponse } from '@/types/api';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  const response: ApiResponse = {
    success: true,
    data: bookmarks,
    meta: { timestamp: new Date().toISOString() }
  };

  return NextResponse.json(response);
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!await validateCsrfToken(request)) {
    throw Errors.forbidden('Invalid CSRF token');
  }

  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const body = await request.json();
  const { conferenceId } = bodySchemas.bookmark.parse(body);

  const bookmark = await prisma.bookmark.create({
    data: {
      userId: session.user.id,
      conferenceId
    }
  });

  const response: ApiResponse = {
    success: true,
    data: bookmark,
    meta: { timestamp: new Date().toISOString() }
  };

  return NextResponse.json(response, { status: 201 });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  if (!await validateCsrfToken(request)) {
    throw Errors.forbidden('Invalid CSRF token');
  }

  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const conferenceId = searchParams.get('conferenceId');

  if (!conferenceId) {
    throw Errors.validation('Conference ID required');
  }

  await prisma.bookmark.deleteMany({
    where: {
      userId: session.user.id,
      conferenceId
    }
  });

  const response: ApiResponse = {
    success: true,
    meta: { timestamp: new Date().toISOString() }
  };

  return NextResponse.json(response);
});
