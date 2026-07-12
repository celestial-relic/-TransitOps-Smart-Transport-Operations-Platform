import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { driverSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { licenseNumber: { contains: search } },
        { employeeId: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.driver.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      drivers,
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
    await requireRole(request, ['FLEET_MANAGER', 'SAFETY_OFFICER']);
    
    const body = await request.json();
    
    let userId = body.userId;
    
    // If user details are passed, create the user first
    if (!userId && body.email && body.name) {
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'User email already exists' }, { status: 400 });
      }

      const defaultPassword = body.password || 'TransitOps2024!';
      const passwordHash = await hashPassword(defaultPassword);

      const user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          role: 'DRIVER',
          passwordHash,
        },
      });
      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId or user details are required' }, { status: 400 });
    }

    // Generate employeeId if not provided
    const employeeId = body.employeeId || `EMP-${Math.floor(100000 + Math.random() * 900000)}`;

    // Now validate driver input using zod
    const driverInput = {
      ...body,
      userId,
      employeeId,
    };
    const parsed = driverSchema.parse(driverInput);

    // Check unique constraints on driver fields
    const existingEmployee = await prisma.driver.findUnique({
      where: { employeeId: parsed.employeeId },
    });
    if (existingEmployee) {
      return NextResponse.json({ error: 'Driver with Employee ID already exists' }, { status: 400 });
    }

    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber: parsed.licenseNumber },
    });
    if (existingLicense) {
      return NextResponse.json({ error: 'Driver with License Number already exists' }, { status: 400 });
    }

    const driver = await prisma.driver.create({
      data: {
        userId: parsed.userId,
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

    return NextResponse.json(driver, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
