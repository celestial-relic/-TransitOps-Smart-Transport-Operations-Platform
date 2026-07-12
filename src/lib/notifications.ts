import prisma from '@/lib/prisma';
import type { NotificationType, Priority } from '@/lib/constants';

// ── Create ─────────────────────────────────────────────────────────────

export async function createNotification(
  userId: string,
  type: NotificationType | string,
  title: string,
  message: string,
  priority: Priority | string = 'NORMAL',
  linkedEntity?: string,
  linkedId?: string,
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      priority,
      linkedEntity: linkedEntity ?? null,
      linkedId: linkedId ?? null,
    },
  });
}

// ── Read ───────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

// ── Update ─────────────────────────────────────────────────────────────

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

// ── Periodic Checks ────────────────────────────────────────────────────

export async function runNotificationChecks(): Promise<{
  licenseExpiry: number;
  maintenanceOverdue: number;
}> {
  // Dynamic import to break the circular dependency at module level
  const { checkLicenseExpiry, checkMaintenanceOverdue } = await import('@/lib/business-rules');

  const licenseExpiry = await checkLicenseExpiry();
  const maintenanceOverdue = await checkMaintenanceOverdue();

  return { licenseExpiry, maintenanceOverdue };
}
