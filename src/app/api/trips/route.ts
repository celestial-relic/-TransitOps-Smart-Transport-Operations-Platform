import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { tripSchema } from '@/lib/validators';
import { generateTripNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: any = {};

    // Enforce row-level security for drivers (own trips only)
    if (authUser.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: authUser.userId },
      });
      if (!driver) {
        return NextResponse.json([]);
      }
      where.driverId = driver.id;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { tripNumber: { contains: search } },
        { source: { contains: search } },
        { destination: { contains: search } },
        { cargoDescription: { contains: search } },
      ];
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(trips);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['FLEET_MANAGER']);
    
    const body = await request.json();
    const parsed = tripSchema.parse(body);

    const tripNumber = generateTripNumber();

    const trip = await prisma.trip.create({
      data: {
        tripNumber,
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
        status: 'DRAFT',
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
