import prisma from '@/lib/prisma';
import { VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus } from '@/lib/constants';
import { createNotification } from '@/lib/notifications';

// ── Types ──────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Dispatch Validation ────────────────────────────────────────────────

export async function validateDispatch(
  vehicleId: string,
  driverId: string,
  cargoWeight: number,
): Promise<ValidationResult> {
  const errors: string[] = [];

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    errors.push('Vehicle not found');
    return { valid: false, errors };
  }
  if (vehicle.status !== VehicleStatus.ACTIVE) {
    errors.push(`Vehicle is ${vehicle.status}, must be ACTIVE for dispatch`);
  }
  if (cargoWeight > vehicle.maxLoad && vehicle.maxLoad > 0) {
    errors.push(`Cargo weight (${cargoWeight} kg) exceeds vehicle max load (${vehicle.maxLoad} kg)`);
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    errors.push('Driver not found');
    return { valid: false, errors };
  }
  if (driver.status !== DriverStatus.AVAILABLE) {
    errors.push(`Driver is ${driver.status}, must be AVAILABLE for dispatch`);
  }
  if (new Date(driver.licenseExpiry) < new Date()) {
    errors.push('Driver license has expired');
  }

  return { valid: errors.length === 0, errors };
}

// ── Trip Lifecycle ─────────────────────────────────────────────────────

export async function onTripDispatch(tripId: string): Promise<void> {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });

  await prisma.$transaction([
    prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.DISPATCHED,
        dispatchedAt: new Date(),
      },
    }),
    prisma.driver.update({
      where: { id: trip.driverId },
      data: { status: DriverStatus.ON_TRIP },
    }),
  ]);
}

export async function onTripComplete(
  tripId: string,
  actualDistance: number,
  actualFuel: number,
): Promise<void> {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: { vehicle: true },
  });

  const fuelCost = actualFuel * 1.5; // default cost estimate, overridden by actual fuel logs

  await prisma.$transaction([
    // Complete the trip
    prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETED,
        actualDistance,
        actualFuel,
        fuelCost,
        completedAt: new Date(),
      },
    }),
    // Release the driver
    prisma.driver.update({
      where: { id: trip.driverId },
      data: { status: DriverStatus.AVAILABLE },
    }),
    // Update vehicle odometer
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: {
        currentOdometer: trip.vehicle.currentOdometer + actualDistance,
      },
    }),
    // Create fuel expense record
    prisma.expense.create({
      data: {
        vehicleId: trip.vehicleId,
        category: 'FUEL',
        amount: fuelCost,
        description: `Fuel for trip ${trip.tripNumber}`,
        date: new Date(),
      },
    }),
    // Create fuel log record
    prisma.fuelLog.create({
      data: {
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        liters: actualFuel,
        costPerLiter: 1.5,
        totalCost: fuelCost,
        mileageAtFill: trip.vehicle.currentOdometer + actualDistance,
        date: new Date(),
        notes: `Auto-logged from trip ${trip.tripNumber}`,
      },
    }),
  ]);
}

export async function onTripCancel(tripId: string, reason: string): Promise<void> {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });

  const updates: any[] = [
    prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    }),
  ];

  // Only revert driver if trip was dispatched or in transit
  if (trip.status === TripStatus.DISPATCHED || trip.status === TripStatus.IN_TRANSIT) {
    updates.push(
      prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.AVAILABLE },
      }),
    );
  }

  await prisma.$transaction(updates);
}

// ── Maintenance Lifecycle ──────────────────────────────────────────────

export async function onMaintenanceStart(maintenanceId: string): Promise<void> {
  const maintenance = await prisma.maintenance.findUniqueOrThrow({
    where: { id: maintenanceId },
  });

  await prisma.$transaction([
    prisma.maintenance.update({
      where: { id: maintenanceId },
      data: {
        status: MaintenanceStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    }),
    prisma.vehicle.update({
      where: { id: maintenance.vehicleId },
      data: { status: VehicleStatus.MAINTENANCE },
    }),
  ]);
}

export async function onMaintenanceComplete(maintenanceId: string): Promise<void> {
  const maintenance = await prisma.maintenance.findUniqueOrThrow({
    where: { id: maintenanceId },
    include: { vehicle: true },
  });

  // Don't restore a RETIRED vehicle back to ACTIVE
  const newVehicleStatus =
    maintenance.vehicle.status === VehicleStatus.RETIRED
      ? VehicleStatus.RETIRED
      : VehicleStatus.ACTIVE;

  await prisma.$transaction([
    prisma.maintenance.update({
      where: { id: maintenanceId },
      data: {
        status: MaintenanceStatus.COMPLETED,
        completedAt: new Date(),
      },
    }),
    prisma.vehicle.update({
      where: { id: maintenance.vehicleId },
      data: { status: newVehicleStatus },
    }),
    // Create maintenance expense record
    prisma.expense.create({
      data: {
        vehicleId: maintenance.vehicleId,
        category: 'MAINTENANCE',
        amount: maintenance.cost,
        description: `Maintenance: ${maintenance.issue}`,
        date: new Date(),
      },
    }),
  ]);
}

// ── Periodic Checks ────────────────────────────────────────────────────

export async function checkLicenseExpiry(): Promise<number> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDrivers = await prisma.driver.findMany({
    where: {
      licenseExpiry: { lte: thirtyDaysFromNow },
      status: { not: DriverStatus.SUSPENDED },
    },
    include: { user: true },
  });

  let count = 0;
  for (const driver of expiringDrivers) {
    const isExpired = new Date(driver.licenseExpiry) < new Date();
    const daysLeft = Math.ceil(
      (new Date(driver.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    // Check for existing recent notification to avoid duplicates
    const existing = await prisma.notification.findFirst({
      where: {
        userId: driver.userId,
        type: 'LICENSE_EXPIRY',
        linkedEntity: 'driver',
        linkedId: driver.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) continue;

    await createNotification(
      driver.userId,
      'LICENSE_EXPIRY',
      isExpired ? 'License Expired' : 'License Expiring Soon',
      isExpired
        ? `Your license (${driver.licenseNumber}) has expired. Please renew immediately.`
        : `Your license (${driver.licenseNumber}) expires in ${daysLeft} days. Please renew before ${driver.licenseExpiry.toISOString().split('T')[0]}.`,
      isExpired ? 'CRITICAL' : 'HIGH',
      'driver',
      driver.id,
    );
    count++;
  }
  return count;
}

export async function checkMaintenanceOverdue(): Promise<number> {
  const now = new Date();

  const overdueItems = await prisma.maintenance.findMany({
    where: {
      scheduledDate: { lt: now },
      status: { in: [MaintenanceStatus.SCHEDULED] },
    },
    include: { vehicle: true },
  });

  // Notify all fleet managers
  const managers = await prisma.user.findMany({
    where: { role: 'FLEET_MANAGER', active: true },
  });

  let count = 0;
  for (const item of overdueItems) {
    for (const manager of managers) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: manager.id,
          type: 'MAINTENANCE_DUE',
          linkedEntity: 'maintenance',
          linkedId: item.id,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      if (existing) continue;

      await createNotification(
        manager.id,
        'MAINTENANCE_DUE',
        'Overdue Maintenance',
        `Maintenance for vehicle ${item.vehicle.registrationNumber} (${item.issue}) was scheduled for ${item.scheduledDate.toISOString().split('T')[0]} and is overdue.`,
        'HIGH',
        'maintenance',
        item.id,
      );
      count++;
    }
  }
  return count;
}
