import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { vehicleSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(request);
    const { id } = await params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { driver: { include: { user: true } } },
        },
        maintenances: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
        fuelLogs: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, ['FLEET_MANAGER', 'SAFETY_OFFICER']);
    const { id } = await params;

    const body = await request.json();
    const parsed = vehicleSchema.parse(body);

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        registrationNumber: parsed.registrationNumber,
        make: parsed.make,
        model: parsed.model,
        year: parsed.year,
        type: parsed.type,
        maxLoad: parsed.maxLoad,
        fuelType: parsed.fuelType,
        status: parsed.status,
        vin: parsed.vin,
        color: parsed.color,
        currentOdometer: parsed.currentOdometer,
        acquisitionCost: parsed.acquisitionCost,
        acquisitionDate: parsed.acquisitionDate,
        insuranceExpiry: parsed.insuranceExpiry,
        insuranceProvider: parsed.insuranceProvider,
        notes: parsed.notes,
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

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Check if vehicle has dependencies
    const tripsCount = await prisma.trip.count({ where: { vehicleId: id } });
    if (tripsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle as it has associated trips' },
        { status: 400 }
      );
    }

    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
