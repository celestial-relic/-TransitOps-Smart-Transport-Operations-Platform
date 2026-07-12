import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ vehicles: [], drivers: [], trips: [] });
    }

    const [vehicles, drivers, trips] = await Promise.all([
      // Search Vehicles
      prisma.vehicle.findMany({
        where: {
          OR: [
            { registrationNumber: { contains: query } },
            { make: { contains: query } },
            { model: { contains: query } },
          ],
        },
        take: 5,
      }),
      // Search Drivers
      prisma.driver.findMany({
        where: {
          OR: [
            { licenseNumber: { contains: query } },
            { employeeId: { contains: query } },
            { user: { name: { contains: query } } },
          ],
        },
        include: { user: true },
        take: 5,
      }),
      // Search Trips
      prisma.trip.findMany({
        where: {
          OR: [
            { tripNumber: { contains: query } },
            { source: { contains: query } },
            { destination: { contains: query } },
          ],
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      vehicles: vehicles.map(v => ({
        id: v.id,
        title: v.registrationNumber,
        subtitle: `${v.make} ${v.model} (${v.year})`,
        type: 'vehicle',
        href: `/vehicles`,
      })),
      drivers: drivers.map(d => ({
        id: d.id,
        title: d.user.name,
        subtitle: `Emp ID: ${d.employeeId} | Lic: ${d.licenseNumber}`,
        type: 'driver',
        href: `/drivers`,
      })),
      trips: trips.map(t => ({
        id: t.id,
        title: t.tripNumber,
        subtitle: `${t.source} → ${t.destination} [${t.status}]`,
        type: 'trip',
        href: `/trips`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
