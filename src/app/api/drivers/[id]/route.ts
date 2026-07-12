import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { driverSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(request);
    const { id } = await params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { vehicle: true },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    return NextResponse.json(driver);
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

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = driverSchema.parse({
      ...body,
      userId: driver.userId, // ensure userId is matched from existing
    });

    // Update associated User name/email if provided
    if (body.name || body.email) {
      const userUpdate: any = {};
      if (body.name) userUpdate.name = body.name;
      if (body.email) userUpdate.email = body.email;

      await prisma.user.update({
        where: { id: driver.userId },
        data: userUpdate,
      });
    }

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        employeeId: parsed.employeeId,
        licenseNumber: parsed.licenseNumber,
        licenseExpiry: parsed.licenseExpiry,
        licenseType: parsed.licenseType,
        experience: parsed.experience,
        safetyScore: parsed.safetyScore,
        status: parsed.status,
        phone: parsed.phone,
        address: parsed.address,
        dateOfBirth: parsed.dateOfBirth,
        emergencyContact: parsed.emergencyContact,
        emergencyPhone: parsed.emergencyPhone,
        notes: parsed.notes,
      },
      include: { user: true },
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

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Check if driver has active dependencies
    const tripsCount = await prisma.trip.count({ where: { driverId: id } });
    if (tripsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete driver as they have associated trips' },
        { status: 400 }
      );
    }

    // Delete associated User, which will cascade delete the Driver
    await prisma.user.delete({
      where: { id: driver.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
