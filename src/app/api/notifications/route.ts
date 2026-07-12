import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getUnreadCount, markAsRead, markAllAsRead, runNotificationChecks } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    // Trigger background checks to create expiring notifications
    try {
      await runNotificationChecks();
    } catch {
      // silent
    }

    if (unreadOnly) {
      const count = await getUnreadCount(authUser.userId);
      return NextResponse.json({ count });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    if (body.id) {
      // Validate ownership
      const notif = await prisma.notification.findUnique({
        where: { id: body.id },
      });
      if (!notif || notif.userId !== authUser.userId) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      await markAsRead(body.id);
    } else {
      await markAllAsRead(authUser.userId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
