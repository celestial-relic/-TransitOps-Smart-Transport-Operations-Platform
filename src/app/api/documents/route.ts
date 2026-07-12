import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const driverId = searchParams.get('driverId');

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;

    const documents = await prisma.document.findMany({
      where,
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const body = await request.json();

    const { name, type, url, size, entityType, entityId, expiryDate } = body;

    if (!name || !type || !url || !entityType || !entityId) {
      return NextResponse.json({ error: 'Missing required document fields' }, { status: 400 });
    }

    const data: any = {
      name,
      type,
      url,
      size: size ? Number(size) : null,
      entityType,
      entityId,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    };

    if (entityType === 'vehicle') {
      data.vehicleId = entityId;
    } else if (entityType === 'driver') {
      data.driverId = entityId;
    }

    const doc = await prisma.document.create({
      data,
    });

    // Create system notification about new document upload
    await prisma.notification.create({
      data: {
        userId: authUser.userId,
        type: 'SYSTEM',
        title: 'New Document Uploaded',
        message: `Document "${name}" has been successfully added to the system.`,
        priority: 'NORMAL',
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
