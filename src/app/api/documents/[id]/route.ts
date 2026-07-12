import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Try deleting local file if it is stored in public/uploads
    if (doc.url.startsWith('/uploads/')) {
      try {
        const filename = doc.url.replace('/uploads/', '');
        const filepath = join(process.cwd(), 'public', 'uploads', filename);
        await unlink(filepath);
      } catch {
        // silent if file doesn't exist on disk
      }
    }

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
