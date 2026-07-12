import prisma from '@/lib/prisma';
import { VehicleStatus, MaintenanceStatus, DriverStatus } from '@/lib/constants';

// ── Types ──────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  type: 'critical' | 'warning' | 'suggestion' | 'positive';
  title: string;
  description: string;
  metric?: string;
  recommendation: string;
  category: string;
}

// ── Generator ──────────────────────────────────────────────────────────

export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];
  let idCounter = 0;
  const nextId = () => `insight-${++idCounter}`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await Promise.all([
    checkHighFuelConsumption(insights, nextId, thirtyDaysAgo),
    checkUnderutilizedVehicles(insights, nextId, thirtyDaysAgo),
    checkDriverSafetyScores(insights, nextId),
    checkOverdueMaintenance(insights, nextId),
    checkHighExpenseCategories(insights, nextId, thirtyDaysAgo),
    checkLicenseExpiry(insights, nextId),
    checkFleetUtilization(insights, nextId),
  ]);

  // Sort: critical first, then warning, suggestion, positive
  const typeOrder: Record<string, number> = { critical: 0, warning: 1, suggestion: 2, positive: 3 };
  insights.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

  return insights;
}

// ── Individual Checks ──────────────────────────────────────────────────

async function checkHighFuelConsumption(
  insights: Insight[],
  nextId: () => string,
  since: Date,
) {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: VehicleStatus.ACTIVE },
    include: {
      fuelLogs: { where: { date: { gte: since } } },
      trips: { where: { status: 'COMPLETED', completedAt: { gte: since } } },
    },
  });

  for (const v of vehicles) {
    const totalLiters = v.fuelLogs.reduce((sum, f) => sum + f.liters, 0);
    const totalDistance = v.trips.reduce((sum, t) => sum + (t.actualDistance ?? 0), 0);
    if (totalDistance < 100) continue; // skip vehicles with insufficient data

    const efficiency = (totalLiters / totalDistance) * 100;
    if (efficiency > 15) {
      insights.push({
        id: nextId(),
        type: 'warning',
        title: `High fuel consumption: ${v.registrationNumber}`,
        description: `Vehicle ${v.registrationNumber} (${v.make} ${v.model}) is consuming ${efficiency.toFixed(1)} L/100km over the last 30 days, which exceeds the 15 L/100km threshold.`,
        metric: `${efficiency.toFixed(1)} L/100km`,
        recommendation: 'Schedule a mechanical inspection. Check tire pressure, air filters, and fuel injectors. Consider driver training on fuel-efficient driving techniques.',
        category: 'fuel',
      });
    }
  }
}

async function checkUnderutilizedVehicles(
  insights: Insight[],
  nextId: () => string,
  since: Date,
) {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: VehicleStatus.ACTIVE },
    include: {
      trips: { where: { createdAt: { gte: since } } },
    },
  });

  for (const v of vehicles) {
    if (v.trips.length < 5) {
      insights.push({
        id: nextId(),
        type: 'suggestion',
        title: `Underutilized vehicle: ${v.registrationNumber}`,
        description: `Vehicle ${v.registrationNumber} has only ${v.trips.length} trip(s) in the last 30 days. Active vehicles should ideally have 5+ trips per month.`,
        metric: `${v.trips.length} trips/month`,
        recommendation: 'Review route assignments. Consider redistributing workload or evaluating whether this vehicle should be reassigned, leased out, or retired to reduce carrying costs.',
        category: 'utilization',
      });
    }
  }
}

async function checkDriverSafetyScores(insights: Insight[], nextId: () => string) {
  const drivers = await prisma.driver.findMany({
    where: {
      status: { in: [DriverStatus.AVAILABLE, DriverStatus.ON_TRIP] },
    },
    include: { user: true },
  });

  for (const d of drivers) {
    if (d.safetyScore < 60) {
      insights.push({
        id: nextId(),
        type: 'critical',
        title: `Critical safety score: ${d.user.name}`,
        description: `Driver ${d.user.name} (${d.employeeId}) has a safety score of ${d.safetyScore}/100, which is critically low and poses operational risk.`,
        metric: `${d.safetyScore}/100`,
        recommendation: 'Immediately schedule a safety review session. Consider temporary suspension until retraining is completed. Review recent trip incidents for root cause.',
        category: 'safety',
      });
    } else if (d.safetyScore < 75) {
      insights.push({
        id: nextId(),
        type: 'warning',
        title: `Declining safety score: ${d.user.name}`,
        description: `Driver ${d.user.name} (${d.employeeId}) has a safety score of ${d.safetyScore}/100, which is below the recommended minimum of 75.`,
        metric: `${d.safetyScore}/100`,
        recommendation: 'Schedule additional safety training. Pair with a senior driver for mentorship rides. Monitor closely over the next 30 days.',
        category: 'safety',
      });
    }
  }
}

async function checkOverdueMaintenance(insights: Insight[], nextId: () => string) {
  const now = new Date();

  const overdueItems = await prisma.maintenance.findMany({
    where: {
      scheduledDate: { lt: now },
      status: MaintenanceStatus.SCHEDULED,
    },
    include: { vehicle: true },
  });

  if (overdueItems.length > 0) {
    const daysOverdue = overdueItems.map((m) => {
      const diff = now.getTime() - new Date(m.scheduledDate).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    });
    const maxOverdue = Math.max(...daysOverdue);

    insights.push({
      id: nextId(),
      type: 'critical',
      title: `${overdueItems.length} overdue maintenance item(s)`,
      description: `There are ${overdueItems.length} maintenance tasks past their scheduled date. The most overdue is ${maxOverdue} days late. Vehicles affected: ${overdueItems.map((m) => m.vehicle.registrationNumber).join(', ')}.`,
      metric: `${overdueItems.length} overdue`,
      recommendation: 'Prioritize and start overdue maintenance immediately. Extended delays increase breakdown risk and repair costs. Consider pulling affected vehicles from active routes.',
      category: 'maintenance',
    });
  }
}

async function checkHighExpenseCategories(
  insights: Insight[],
  nextId: () => string,
  since: Date,
) {
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: since } },
  });

  if (expenses.length === 0) return;

  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    total += e.amount;
  }

  // Flag any single category exceeding 40% of total spend
  for (const [category, amount] of Object.entries(byCategory)) {
    const pct = (amount / total) * 100;
    if (pct > 40 && total > 500) {
      insights.push({
        id: nextId(),
        type: 'warning',
        title: `High spending: ${category}`,
        description: `${category} expenses account for ${pct.toFixed(0)}% of total fleet spending ($${amount.toFixed(2)} of $${total.toFixed(2)}) in the last 30 days.`,
        metric: `${pct.toFixed(0)}% of total`,
        recommendation: `Investigate ${category.toLowerCase()} costs for optimization opportunities. Compare vendor pricing, negotiate bulk rates, and review whether preventive measures can reduce this category.`,
        category: 'expenses',
      });
    }
  }
}

async function checkLicenseExpiry(insights: Insight[], nextId: () => string) {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDrivers = await prisma.driver.findMany({
    where: {
      licenseExpiry: { lte: thirtyDaysFromNow },
      status: { not: DriverStatus.SUSPENDED },
    },
    include: { user: true },
  });

  const expired = expiringDrivers.filter((d) => new Date(d.licenseExpiry) < new Date());
  const expiringSoon = expiringDrivers.filter((d) => new Date(d.licenseExpiry) >= new Date());

  if (expired.length > 0) {
    insights.push({
      id: nextId(),
      type: 'critical',
      title: `${expired.length} driver(s) with expired licenses`,
      description: `Drivers with expired licenses: ${expired.map((d) => d.user.name).join(', ')}. These drivers must not be dispatched until their licenses are renewed.`,
      metric: `${expired.length} expired`,
      recommendation: 'Immediately flag these drivers as SUSPENDED. Contact them to initiate license renewal. Reassign their scheduled trips to available drivers.',
      category: 'compliance',
    });
  }

  if (expiringSoon.length > 0) {
    insights.push({
      id: nextId(),
      type: 'warning',
      title: `${expiringSoon.length} license(s) expiring within 30 days`,
      description: `Drivers with licenses expiring soon: ${expiringSoon.map((d) => `${d.user.name} (${Math.ceil((new Date(d.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d)`).join(', ')}.`,
      metric: `${expiringSoon.length} expiring`,
      recommendation: 'Notify drivers to begin the renewal process. Plan for potential gaps in driver availability and adjust schedules accordingly.',
      category: 'compliance',
    });
  }
}

async function checkFleetUtilization(insights: Insight[], nextId: () => string) {
  const totalVehicles = await prisma.vehicle.count();
  if (totalVehicles === 0) return;

  const activeVehicles = await prisma.vehicle.count({
    where: { status: VehicleStatus.ACTIVE },
  });
  const inMaintenance = await prisma.vehicle.count({
    where: { status: VehicleStatus.MAINTENANCE },
  });
  const retired = await prisma.vehicle.count({
    where: { status: VehicleStatus.RETIRED },
  });

  const utilizationRate = (activeVehicles / totalVehicles) * 100;

  if (utilizationRate >= 80) {
    insights.push({
      id: nextId(),
      type: 'positive',
      title: 'Strong fleet utilization',
      description: `Fleet utilization is at ${utilizationRate.toFixed(0)}% — ${activeVehicles} of ${totalVehicles} vehicles are active. ${inMaintenance} in maintenance, ${retired} retired.`,
      metric: `${utilizationRate.toFixed(0)}%`,
      recommendation: 'Maintain current fleet management practices. Monitor for upcoming maintenance that could temporarily reduce availability.',
      category: 'utilization',
    });
  } else if (utilizationRate >= 50) {
    insights.push({
      id: nextId(),
      type: 'suggestion',
      title: 'Moderate fleet utilization',
      description: `Fleet utilization is at ${utilizationRate.toFixed(0)}% — only ${activeVehicles} of ${totalVehicles} vehicles are active. ${inMaintenance} in maintenance, ${retired} retired.`,
      metric: `${utilizationRate.toFixed(0)}%`,
      recommendation: 'Review maintenance schedules to reduce vehicle downtime. Consider retiring or selling vehicles that have been in maintenance for extended periods.',
      category: 'utilization',
    });
  } else {
    insights.push({
      id: nextId(),
      type: 'critical',
      title: 'Low fleet utilization',
      description: `Fleet utilization is critically low at ${utilizationRate.toFixed(0)}% — only ${activeVehicles} of ${totalVehicles} vehicles are operational. ${inMaintenance} in maintenance, ${retired} retired.`,
      metric: `${utilizationRate.toFixed(0)}%`,
      recommendation: 'Urgent review required. Expedite pending maintenance. Evaluate fleet size against actual operational needs. Consider emergency vehicle procurement if active count is insufficient.',
      category: 'utilization',
    });
  }
}
