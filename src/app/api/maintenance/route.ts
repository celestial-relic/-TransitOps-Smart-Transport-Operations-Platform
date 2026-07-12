import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { maintenanceSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const vehicleId = searchParams.get('vehicleId') || '';

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    const maintenances = await prisma.maintenance.findMany({
      where,
      include: { vehicle: true },
      orderBy: { scheduledDate: 'desc' },
    });

    return NextResponse.json(maintenances);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['FLEET_MANAGER', 'SAFETY_OFFICER']);
    
    const body = await request.json();
    const parsed = maintenanceSchema.parse(body);

    const maintenance = await prisma.maintenance.create({
      data: {
        vehicleId: parsed.vehicleId,
        type: parsed.type,
        issue: parsed.issue,
        description: body.description || null,
        mechanic: body.mechanic || null,
        cost: parsed.cost,
        priority: parsed.priority,
        scheduledDate: parsed.scheduledDate,
        status: 'SCHEDULED',
      },
      include: { vehicle: true },
    });

    return NextResponse.json(maintenance, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
