import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCsrfToken } from '@/lib/csrf';
import { withErrorHandling, Errors } from '@/lib/errorHandler';
import { bodySchemas, querySchemas } from '@/lib/apiSchemas';
import type { ApiResponse } from '@/types/api';

/**
 * GET /api/user/saved-searches
 * List the authenticated user's saved search filters (issue #56).
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  const response: ApiResponse = {
    success: true,
    data: searches,
    meta: { timestamp: new Date().toISOString() },
  };
  return NextResponse.json(response);
});

/**
 * POST /api/user/saved-searches
 * Persist the current filter set under a user-chosen name.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!(await validateCsrfToken(request))) {
    throw Errors.forbidden('Invalid CSRF token');
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const body = await request.json();
  const { name, filters } = bodySchemas.savedSearch.parse(body);

  // Cap at 25 saved searches per user to prevent abuse.
  const count = await prisma.savedSearch.count({
    where: { userId: session.user.id },
  });
  if (count >= 25) {
    throw Errors.validation('Maximum of 25 saved searches reached. Delete one first.');
  }

  const created = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name,
      filters,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: created,
    meta: { timestamp: new Date().toISOString() },
  };
  return NextResponse.json(response, { status: 201 });
});

/**
 * DELETE /api/user/saved-searches?id=...
 */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  if (!(await validateCsrfToken(request))) {
    throw Errors.forbidden('Invalid CSRF token');
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const { id } = querySchemas.savedSearchId.parse({
    id: request.nextUrl.searchParams.get('id') ?? undefined,
  });

  const result = await prisma.savedSearch.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) {
    throw Errors.notFound('Saved search not found');
  }

  const response: ApiResponse = {
    success: true,
    data: { deleted: true },
    meta: { timestamp: new Date().toISOString() },
  };
  return NextResponse.json(response);
});
