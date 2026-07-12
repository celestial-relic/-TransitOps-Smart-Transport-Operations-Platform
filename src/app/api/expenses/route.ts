import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const vehicleId = searchParams.get('vehicleId') || '';

    const where: any = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { vehicle: true },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireRole(request, ['FLEET_MANAGER', 'FINANCIAL_ANALYST']);
    
    const body = await request.json();
    const parsed = expenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        vehicleId: parsed.vehicleId || null,
        category: parsed.category,
        amount: parsed.amount,
        description: parsed.description,
        vendor: parsed.vendor,
        date: parsed.date,
        approvedBy: authUser.email,
        notes: parsed.notes,
      },
      include: { vehicle: true },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
