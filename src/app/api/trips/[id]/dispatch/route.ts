import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { validateDispatch, onTripDispatch } from '@/lib/business-rules';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, ['FLEET_MANAGER']);
    const { id } = await params;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only draft trips can be dispatched' }, { status: 400 });
    }

    // Run business validation rules
    const validation = await validateDispatch(trip.vehicleId, trip.driverId, trip.cargoWeight);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Dispatch validation failed', details: validation.errors }, { status: 400 });
    }

    await onTripDispatch(id);

    return NextResponse.json({ success: true, message: 'Trip successfully dispatched' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
