import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { onTripCancel } from '@/lib/business-rules';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Completed or already cancelled trips cannot be cancelled' }, { status: 400 });
    }

    // Role-based validation
    if (authUser.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: authUser.userId },
      });
      if (!driver || trip.driverId !== driver.id) {
        return NextResponse.json({ error: 'Unauthorized to cancel this trip' }, { status: 403 });
      }
    } else if (authUser.role !== 'FLEET_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized to cancel trips' }, { status: 403 });
    }

    const body = await request.json();
    const reason = body.reason || 'No reason provided';

    await onTripCancel(id, reason);

    return NextResponse.json({ success: true, message: 'Trip successfully cancelled' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
