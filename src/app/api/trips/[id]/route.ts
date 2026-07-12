import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { tripSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Driver restriction
    if (authUser.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: authUser.userId },
      });
      if (!driver || trip.driverId !== driver.id) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
      }
    }

    return NextResponse.json(trip);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
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
      return NextResponse.json({ error: 'Only draft trips can be modified' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = tripSchema.parse(body);

    const updated = await prisma.trip.update({
      where: { id },
      data: {
        vehicleId: parsed.vehicleId,
        driverId: parsed.driverId,
        source: parsed.source,
        destination: parsed.destination,
        cargoDescription: parsed.cargoDescription,
        cargoWeight: parsed.cargoWeight,
        plannedDistance: parsed.plannedDistance,
        estimatedFuel: parsed.estimatedFuel,
        scheduledDate: parsed.scheduledDate,
        priority: parsed.priority,
        notes: parsed.notes,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    if (trip.status !== 'DRAFT' && trip.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Only DRAFT or CANCELLED trips can be deleted' }, { status: 400 });
    }

    await prisma.trip.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
