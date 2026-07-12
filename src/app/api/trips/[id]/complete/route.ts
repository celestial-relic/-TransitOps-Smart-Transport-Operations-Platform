import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { onTripComplete } from '@/lib/business-rules';

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

    if (trip.status !== 'DISPATCHED' && trip.status !== 'IN_TRANSIT') {
      return NextResponse.json({ error: 'Only dispatched or in-transit trips can be completed' }, { status: 400 });
    }

    // Role-based validation
    if (authUser.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: authUser.userId },
      });
      if (!driver || trip.driverId !== driver.id) {
        return NextResponse.json({ error: 'Unauthorized to complete this trip' }, { status: 403 });
      }
    } else if (authUser.role !== 'FLEET_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized to complete trips' }, { status: 403 });
    }

    const body = await request.json();
    const actualDistance = parseFloat(body.actualDistance);
    const actualFuel = parseFloat(body.actualFuel);

    if (isNaN(actualDistance) || actualDistance < 0) {
      return NextResponse.json({ error: 'Valid actualDistance is required' }, { status: 400 });
    }
    if (isNaN(actualFuel) || actualFuel < 0) {
      return NextResponse.json({ error: 'Valid actualFuel is required' }, { status: 400 });
    }

    await onTripComplete(id, actualDistance, actualFuel);

    return NextResponse.json({ success: true, message: 'Trip successfully completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
