import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const statusSchema = z.object({
  bookmarkId: z.string(),
  status: z.enum(['saved', 'applied', 'accepted', 'rejected']),
});

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookmarkId, status } = statusSchema.parse(body);

    // Verify ownership
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark || bookmark.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).bookmark.update({
      where: { id: bookmarkId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Bookmark Update Error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}