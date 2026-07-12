import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { vehicleSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search } },
        { make: { contains: search } },
        { model: { contains: search } },
        { vin: { contains: search } },
      ];
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      vehicles,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['FLEET_MANAGER']);
    
    const body = await request.json();
    const parsed = vehicleSchema.parse(body);

    const existing = await prisma.vehicle.findUnique({
      where: { registrationNumber: parsed.registrationNumber },
    });
    if (existing) {
      return NextResponse.json({ error: 'Vehicle with registration number already exists' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
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

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
