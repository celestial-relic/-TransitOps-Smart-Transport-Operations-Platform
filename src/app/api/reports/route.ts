import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['FLEET_MANAGER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']);
    
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const fromDate = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = toStr ? new Date(toStr) : new Date();

    // Queries inside date range
    const trips = await prisma.trip.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: { vehicle: true, driver: { include: { user: true } } },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
      },
    });

    const fuelLogs = await prisma.fuelLog.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
      },
    });

    // Calculations
    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'COMPLETED').length;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalFuel = fuelLogs.reduce((sum, f) => sum + f.liters, 0);

    // Fuel Efficiency
    const completedTripsWithDistance = trips.filter(t => t.status === 'COMPLETED' && t.actualDistance && t.actualFuel);
    const totalDistance = completedTripsWithDistance.reduce((sum, t) => sum + (t.actualDistance ?? 0), 0);
    const totalDistanceFuel = completedTripsWithDistance.reduce((sum, t) => sum + (t.actualFuel ?? 0), 0);
    const avgFuelEfficiency = totalDistance > 0 ? (totalDistanceFuel / totalDistance) * 100 : 0;

    // Expenses by Category
    const expensesMap: Record<string, number> = {};
    expenses.forEach(e => {
      expensesMap[e.category] = (expensesMap[e.category] ?? 0) + e.amount;
    });
    const expensesByCategory = Object.entries(expensesMap).map(([category, amount]) => ({
      category,
      amount,
    }));

    // Trips by Status
    const statusMap: Record<string, number> = {};
    trips.forEach(t => {
      statusMap[t.status] = (statusMap[t.status] ?? 0) + 1;
    });
    const tripsByStatus = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // Top Vehicles by completed trips
    const vehicleTripsMap: Record<string, { reg: string, count: number }> = {};
    trips.filter(t => t.status === 'COMPLETED').forEach(t => {
      if (!vehicleTripsMap[t.vehicleId]) {
        vehicleTripsMap[t.vehicleId] = { reg: t.vehicle.registrationNumber, count: 0 };
      }
      vehicleTripsMap[t.vehicleId].count++;
    });
    const topVehicles = Object.values(vehicleTripsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top Drivers by completed trips
    const driverTripsMap: Record<string, { name: string, count: number }> = {};
    trips.filter(t => t.status === 'COMPLETED').forEach(t => {
      if (!driverTripsMap[t.driverId]) {
        driverTripsMap[t.driverId] = { name: t.driver.user.name, count: 0 };
      }
      driverTripsMap[t.driverId].count++;
    });
    const topDrivers = Object.values(driverTripsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Monthly expense trend (last 6 months)
    const monthlyExpensesMap: Record<string, number> = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trendExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: sixMonthsAgo },
      },
    });

    // Initialize 6 months in map
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyExpensesMap[key] = 0;
    }

    trendExpenses.forEach(e => {
      const key = new Date(e.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (monthlyExpensesMap[key] !== undefined) {
        monthlyExpensesMap[key] += e.amount;
      }
    });

    const monthlyExpenses = Object.entries(monthlyExpensesMap)
      .map(([month, amount]) => ({ month, amount }))
      .reverse();

    return NextResponse.json({
      totalTrips,
      completedTrips,
      totalExpenses,
      totalFuel,
      avgFuelEfficiency,
      expensesByCategory,
      tripsByStatus,
      monthlyExpenses,
      topVehicles,
      topDrivers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
