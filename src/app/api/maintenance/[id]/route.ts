import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { maintenanceSchema } from '@/lib/validators';
import { onMaintenanceStart, onMaintenanceComplete } from '@/lib/business-rules';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(request);
    const { id } = await params;

    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!maintenance) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }

    return NextResponse.json(maintenance);
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

    const existing = await prisma.maintenance.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Check if we are updating status
    const newStatus = body.status;
    if (newStatus && newStatus !== existing.status) {
      if (newStatus === 'IN_PROGRESS' && existing.status === 'SCHEDULED') {
        await onMaintenanceStart(id);
      } else if (newStatus === 'COMPLETED' && (existing.status === 'IN_PROGRESS' || existing.status === 'SCHEDULED')) {
        // We may want to set mechanic / actual cost before completing
        await prisma.maintenance.update({
          where: { id },
          data: {
            mechanic: body.mechanic ?? existing.mechanic,
            cost: body.cost !== undefined ? parseFloat(body.cost) : existing.cost,
            notes: body.notes ?? existing.notes,
          },
        });
        await onMaintenanceComplete(id);
      } else {
        // Generic status update (e.g. CANCELLED)
        await prisma.maintenance.update({
          where: { id },
          data: { status: newStatus },
        });
      }
    }

    // Now update other fields (if Zod allows)
    const parsed = maintenanceSchema.parse({
      vehicleId: body.vehicleId ?? existing.vehicleId,
      type: body.type ?? existing.type,
      issue: body.issue ?? existing.issue,
      description: body.description ?? existing.description,
      mechanic: body.mechanic ?? existing.mechanic,
      cost: body.cost ?? existing.cost,
      priority: body.priority ?? existing.priority,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : existing.scheduledDate,
    });

    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        vehicleId: parsed.vehicleId,
        type: parsed.type,
        issue: parsed.issue,
        description: body.description ?? null,
        mechanic: parsed.mechanic,
        cost: parsed.cost,
        priority: parsed.priority,
        scheduledDate: parsed.scheduledDate,
        notes: body.notes ?? null,
      },
      include: { vehicle: true },
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

    const maintenance = await prisma.maintenance.findUnique({ where: { id } });
    if (!maintenance) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }

    if (maintenance.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot delete maintenance tasks currently in progress' },
        { status: 400 }
      );
    }

    await prisma.maintenance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
