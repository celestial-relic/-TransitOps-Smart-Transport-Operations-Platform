import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { fuelLogSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId') || '';
    
    const where: any = {};

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    // Drivers see only their own fuel logs
    if (authUser.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: authUser.userId },
      });
      if (!driver) {
        return NextResponse.json([]);
      }
      where.driverId = driver.id;
    }

    const logs = await prisma.fuelLog.findMany({
      where,
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const body = await request.json();

    let driverId = body.driverId;
    if (authUser.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: authUser.userId },
      });
      if (!driver) {
        return NextResponse.json({ error: 'Driver profile not found' }, { status: 400 });
      }
      driverId = driver.id;
    }

    const parsed = fuelLogSchema.parse({
      ...body,
      driverId,
    });

    // Create fuel log
    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: parsed.vehicleId,
        driverId: parsed.driverId || null,
        liters: parsed.liters,
        costPerLiter: parsed.costPerLiter,
        totalCost: parsed.totalCost,
        mileageAtFill: parsed.mileageAtFill,
        fuelStation: parsed.fuelStation,
        date: parsed.date,
        notes: parsed.notes,
      },
    });

    // Also auto-create a matching Expense record of category FUEL!
    await prisma.expense.create({
      data: {
        vehicleId: parsed.vehicleId,
        category: 'FUEL',
        amount: parsed.totalCost,
        description: `Fuel purchase: ${parsed.liters}L at ${parsed.fuelStation || 'Station'}`,
        date: parsed.date,
        approvedBy: authUser.email,
      },
    });

    // Update vehicle odometer if this mileage is higher
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parsed.vehicleId },
    });
    if (vehicle && parsed.mileageAtFill > vehicle.currentOdometer) {
      await prisma.vehicle.update({
        where: { id: parsed.vehicleId },
        data: { currentOdometer: parsed.mileageAtFill },
      });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
