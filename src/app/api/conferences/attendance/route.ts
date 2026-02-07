import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCsrfToken } from '@/lib/csrf';
import { securityLogger } from '@/lib/logger';

const attendanceSchema = z.object({
  conferenceId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    if (!await validateCsrfToken(request)) {
      securityLogger.warn('Invalid CSRF token on attendance toggle');
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      securityLogger.info('Unauthorized attendance toggle attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conferenceId } = attendanceSchema.parse(body);

    const userId = session.user.id;

    // Check if already attending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).attendance.findUnique({
      where: {
        userId_conferenceId: { userId, conferenceId }
      }
    });

    if (existing) {
      // Remove attendance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).attendance.delete({
        where: {
          userId_conferenceId: { userId, conferenceId }
        }
      });
      return NextResponse.json({ attending: false });
    } else {
      // Add attendance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).attendance.create({
        data: { userId, conferenceId }
      });
      return NextResponse.json({ attending: true });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Attendance Toggle Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}