import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Seed ───────────────────────────────────────────────────────────────

async function main() {
  console.log('🗑️  Clearing existing data...');

  // Delete in dependency order (children first)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');

  // ── Password hash ──────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('TransitOps2024!', 12);

  // ── Users ──────────────────────────────────────────────────────────
  console.log('👤 Creating users...');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@transitops.com',
      passwordHash,
      name: 'Marcus Chen',
      role: 'FLEET_MANAGER',
    },
  });

  const driverUser = await prisma.user.create({
    data: {
      email: 'driver@transitops.com',
      passwordHash,
      name: 'Elena Rodriguez',
      role: 'DRIVER',
    },
  });

  const safetyUser = await prisma.user.create({
    data: {
      email: 'safety@transitops.com',
      passwordHash,
      name: 'James Morrison',
      role: 'SAFETY_OFFICER',
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      email: 'finance@transitops.com',
      passwordHash,
      name: 'Sarah Kim',
      role: 'FINANCIAL_ANALYST',
    },
  });

  // 6 additional driver users
  const driverUserData = [
    { email: 'driver2@transitops.com', name: 'Ahmed Hassan' },
    { email: 'driver3@transitops.com', name: 'Lisa Chang' },
    { email: 'driver4@transitops.com', name: 'Dmitri Volkov' },
    { email: 'driver5@transitops.com', name: 'Fatima Al-Rashid' },
    { email: 'driver6@transitops.com', name: 'Carlos Mendez' },
    { email: 'driver7@transitops.com', name: 'Rebecca O\'Brien' },
    { email: 'driver8@transitops.com', name: 'Tomasz Kowalski' },
    { email: 'driver9@transitops.com', name: 'Priya Sharma' },
    { email: 'driver10@transitops.com', name: 'Michael Thompson' },
  ];

  const additionalDriverUsers = [];
  for (const d of driverUserData) {
    const u = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash,
        name: d.name,
        role: 'DRIVER',
      },
    });
    additionalDriverUsers.push(u);
  }

  // All driver-role users: Elena + first 9 additional = 10 total
  const allDriverUsers = [driverUser, ...additionalDriverUsers.slice(0, 9)];

  console.log(`   Created ${4 + additionalDriverUsers.length} users`);

  // ── Vehicles ───────────────────────────────────────────────────────
  console.log('🚛 Creating vehicles...');

  const vehicleData = [
    { reg: 'TRK-001', make: 'Volvo', model: 'FH16', year: 2022, type: 'TRUCK', color: 'White', maxLoad: 25000, odometer: 187500, fuel: 'DIESEL', cost: 145000, status: 'ACTIVE', insuranceDays: 180 },
    { reg: 'TRK-002', make: 'Scania', model: 'R500', year: 2021, type: 'TRUCK', color: 'Blue', maxLoad: 28000, odometer: 245000, fuel: 'DIESEL', cost: 155000, status: 'ACTIVE', insuranceDays: 90 },
    { reg: 'TRK-003', make: 'Mercedes-Benz', model: 'Actros', year: 2023, type: 'TRUCK', color: 'Silver', maxLoad: 26000, odometer: 82000, fuel: 'DIESEL', cost: 168000, status: 'ACTIVE', insuranceDays: 365 },
    { reg: 'TRK-004', make: 'Kenworth', model: 'T680', year: 2020, type: 'TRUCK', color: 'Red', maxLoad: 36000, odometer: 342000, fuel: 'DIESEL', cost: 138000, status: 'MAINTENANCE', insuranceDays: 45 },
    { reg: 'TRK-005', make: 'Peterbilt', model: '579', year: 2022, type: 'TRUCK', color: 'Black', maxLoad: 34000, odometer: 198000, fuel: 'DIESEL', cost: 142000, status: 'ACTIVE', insuranceDays: 210 },
    { reg: 'VAN-006', make: 'Mercedes-Benz', model: 'Sprinter', year: 2023, type: 'VAN', color: 'White', maxLoad: 3500, odometer: 45000, fuel: 'DIESEL', cost: 52000, status: 'ACTIVE', insuranceDays: 300 },
    { reg: 'VAN-007', make: 'Iveco', model: 'Daily', year: 2022, type: 'VAN', color: 'Gray', maxLoad: 3000, odometer: 67000, fuel: 'DIESEL', cost: 42000, status: 'ACTIVE', insuranceDays: 150 },
    { reg: 'VAN-008', make: 'MAN', model: 'TGE', year: 2021, type: 'VAN', color: 'Blue', maxLoad: 4500, odometer: 98000, fuel: 'DIESEL', cost: 48000, status: 'ACTIVE', insuranceDays: -15 },
    { reg: 'TRL-009', make: 'Schmitz Cargobull', model: 'S.CS', year: 2020, type: 'TRAILER', color: 'White', maxLoad: 40000, odometer: 320000, fuel: 'DIESEL', cost: 35000, status: 'ACTIVE', insuranceDays: 120 },
    { reg: 'TRL-010', make: 'Krone', model: 'Mega Liner', year: 2022, type: 'TRAILER', color: 'Gray', maxLoad: 38000, odometer: 145000, fuel: 'DIESEL', cost: 38000, status: 'ACTIVE', insuranceDays: 240 },
    { reg: 'TRL-011', make: 'Schmitz Cargobull', model: 'S.KO', year: 2019, type: 'TRAILER', color: 'White', maxLoad: 35000, odometer: 410000, fuel: 'DIESEL', cost: 32000, status: 'MAINTENANCE', insuranceDays: -30 },
    { reg: 'BUS-012', make: 'Volvo', model: '9700', year: 2023, type: 'BUS', color: 'Silver', maxLoad: 8000, odometer: 25000, fuel: 'DIESEL', cost: 320000, status: 'ACTIVE', insuranceDays: 400 },
    { reg: 'BUS-013', make: 'MAN', model: 'Lion\'s Coach', year: 2021, type: 'BUS', color: 'White', maxLoad: 7500, odometer: 156000, fuel: 'DIESEL', cost: 290000, status: 'ACTIVE', insuranceDays: 60 },
    { reg: 'BUS-014', make: 'DAF', model: 'XF', year: 2022, type: 'TRUCK', color: 'Green', maxLoad: 30000, odometer: 215000, fuel: 'DIESEL', cost: 135000, status: 'ACTIVE', insuranceDays: 175 },
    { reg: 'BUS-015', make: 'Scania', model: 'Touring', year: 2018, type: 'BUS', color: 'Blue', maxLoad: 7000, odometer: 489000, fuel: 'DIESEL', cost: 260000, status: 'RETIRED', insuranceDays: -90 },
  ];

  const vehicles = [];
  for (const v of vehicleData) {
    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: v.reg,
        make: v.make,
        model: v.model,
        year: v.year,
        type: v.type,
        color: v.color,
        vin: `WDB${v.year}${Math.random().toString(36).substring(2, 13).toUpperCase()}`,
        maxLoad: v.maxLoad,
        currentOdometer: v.odometer,
        fuelType: v.fuel,
        acquisitionCost: v.cost,
        acquisitionDate: new Date(v.year, Math.floor(Math.random() * 12), 1),
        insuranceExpiry: daysFromNow(v.insuranceDays),
        insuranceProvider: pick(['Allianz Commercial', 'Zurich Fleet', 'AXA Transport', 'Liberty Mutual', 'Travelers Insurance']),
        status: v.status,
        notes: v.status === 'MAINTENANCE' ? 'Currently undergoing scheduled maintenance' : v.status === 'RETIRED' ? 'Decommissioned due to age and high mileage' : null,
      },
    });
    vehicles.push(vehicle);
  }

  console.log(`   Created ${vehicles.length} vehicles`);

  // ── Drivers ────────────────────────────────────────────────────────
  console.log('🧑‍✈️ Creating drivers...');

  const driverRecordData = [
    { idx: 0, empId: 'EMP-001', phone: '+1-555-0101', license: 'CDL-2024-00101', licenseType: 'CDL-A', licenseExpiryDays: 400, experience: 12, safety: 97, status: 'AVAILABLE', address: '123 Oak Street, New York, NY 10001' },
    { idx: 1, empId: 'EMP-002', phone: '+1-555-0102', license: 'CDL-2024-00102', licenseType: 'CDL-A', licenseExpiryDays: 25, experience: 8, safety: 92, status: 'ON_TRIP', address: '456 Pine Ave, Chicago, IL 60601' },
    { idx: 2, empId: 'EMP-003', phone: '+1-555-0103', license: 'CDL-2024-00103', licenseType: 'CDL-B', licenseExpiryDays: 200, experience: 5, safety: 88, status: 'AVAILABLE', address: '789 Elm Blvd, Houston, TX 77001' },
    { idx: 3, empId: 'EMP-004', phone: '+1-555-0104', license: 'CDL-2024-00104', licenseType: 'CDL-A', licenseExpiryDays: 15, experience: 15, safety: 95, status: 'ON_TRIP', address: '321 Maple Dr, Phoenix, AZ 85001' },
    { idx: 4, empId: 'EMP-005', phone: '+1-555-0105', license: 'CDL-2024-00105', licenseType: 'CDL-C', licenseExpiryDays: 300, experience: 3, safety: 78, status: 'AVAILABLE', address: '654 Cedar Ln, Philadelphia, PA 19101' },
    { idx: 5, empId: 'EMP-006', phone: '+1-555-0106', license: 'CDL-2024-00106', licenseType: 'CDL-A', licenseExpiryDays: 180, experience: 20, safety: 100, status: 'AVAILABLE', address: '987 Birch Ct, San Antonio, TX 78201' },
    { idx: 6, empId: 'EMP-007', phone: '+1-555-0107', license: 'CDL-2024-00107', licenseType: 'CDL-B', licenseExpiryDays: 90, experience: 7, safety: 65, status: 'AVAILABLE', address: '147 Spruce Way, San Diego, CA 92101' },
    { idx: 7, empId: 'EMP-008', phone: '+1-555-0108', license: 'CDL-2024-00108', licenseType: 'CDL-A', licenseExpiryDays: 500, experience: 10, safety: 91, status: 'ON_TRIP', address: '258 Walnut Rd, Dallas, TX 75201' },
    { idx: 8, empId: 'EMP-009', phone: '+1-555-0109', license: 'CDL-2024-00109', licenseType: 'CDL-C', licenseExpiryDays: 120, experience: 2, safety: 84, status: 'AVAILABLE', address: '369 Willow St, San Jose, CA 95101' },
    { idx: 9, empId: 'EMP-010', phone: '+1-555-0110', license: 'CDL-2024-00110', licenseType: 'CDL-B', licenseExpiryDays: 60, experience: 6, safety: 72, status: 'OFF_DUTY', address: '480 Aspen Pl, Austin, TX 73301' },
  ];

  const drivers = [];
  for (const d of driverRecordData) {
    const driver = await prisma.driver.create({
      data: {
        userId: allDriverUsers[d.idx].id,
        employeeId: d.empId,
        phone: d.phone,
        address: d.address,
        dateOfBirth: new Date(1980 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
        licenseNumber: d.license,
        licenseType: d.licenseType,
        licenseExpiry: daysFromNow(d.licenseExpiryDays),
        experience: d.experience,
        safetyScore: d.safety,
        status: d.status,
        emergencyContact: pick(['Maria Rodriguez', 'John Smith', 'Wei Zhang', 'Anna Kowalski', 'Hassan Ali']),
        emergencyPhone: `+1-555-0${200 + d.idx}`,
      },
    });
    drivers.push(driver);
  }

  console.log(`   Created ${drivers.length} drivers`);

  // ── Trips ──────────────────────────────────────────────────────────
  console.log('🗺️  Creating trips...');

  const routes = [
    { source: 'New York', destination: 'Chicago', dist: 1270, cargo: 'Electronics' },
    { source: 'Los Angeles', destination: 'San Francisco', dist: 615, cargo: 'Fresh Produce' },
    { source: 'Houston', destination: 'Dallas', dist: 365, cargo: 'Industrial Equipment' },
    { source: 'Miami', destination: 'Atlanta', dist: 1065, cargo: 'Pharmaceuticals' },
    { source: 'Seattle', destination: 'Portland', dist: 280, cargo: 'Lumber' },
    { source: 'Denver', destination: 'Salt Lake City', dist: 835, cargo: 'Auto Parts' },
    { source: 'Boston', destination: 'Philadelphia', dist: 495, cargo: 'Textiles' },
    { source: 'Phoenix', destination: 'Las Vegas', dist: 475, cargo: 'Construction Materials' },
    { source: 'Detroit', destination: 'Cleveland', dist: 275, cargo: 'Steel Components' },
    { source: 'Minneapolis', destination: 'Milwaukee', dist: 540, cargo: 'Agricultural Products' },
    { source: 'Nashville', destination: 'Memphis', dist: 340, cargo: 'Consumer Goods' },
    { source: 'San Diego', destination: 'Sacramento', dist: 830, cargo: 'Medical Supplies' },
    { source: 'Charlotte', destination: 'Richmond', dist: 530, cargo: 'Furniture' },
    { source: 'Tampa', destination: 'Orlando', dist: 135, cargo: 'Beverage Products' },
    { source: 'Kansas City', destination: 'St. Louis', dist: 395, cargo: 'Grain Shipment' },
    { source: 'Pittsburgh', destination: 'Columbus', dist: 265, cargo: 'Chemical Compounds' },
    { source: 'Indianapolis', destination: 'Cincinnati', dist: 175, cargo: 'Paper Products' },
    { source: 'New Orleans', destination: 'Baton Rouge', dist: 130, cargo: 'Petrochemicals' },
    { source: 'Raleigh', destination: 'Norfolk', dist: 260, cargo: 'Tech Hardware' },
    { source: 'Oklahoma City', destination: 'Tulsa', dist: 170, cargo: 'Machine Parts' },
    { source: 'Buffalo', destination: 'Syracuse', dist: 245, cargo: 'Dairy Products' },
    { source: 'Albuquerque', destination: 'El Paso', dist: 450, cargo: 'Mining Equipment' },
    { source: 'Omaha', destination: 'Des Moines', dist: 235, cargo: 'Livestock Feed' },
    { source: 'Jacksonville', destination: 'Savannah', dist: 225, cargo: 'Frozen Foods' },
    { source: 'Louisville', destination: 'Lexington', dist: 125, cargo: 'Bourbon Barrels' },
  ];

  const tripStatuses = [
    ...Array(5).fill('DRAFT'),
    ...Array(5).fill('DISPATCHED'),
    ...Array(5).fill('IN_TRANSIT'),
    ...Array(7).fill('COMPLETED'),
    ...Array(3).fill('CANCELLED'),
  ];

  const trips = [];
  for (let i = 0; i < 25; i++) {
    const route = routes[i];
    const status = tripStatuses[i];
    const driverIdx = i % drivers.length;
    const vehicleIdx = i % vehicles.length;
    const tripNum = `TRP-2024${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}-${String(1000 + i).padStart(4, '0')}`;
    const weight = randomBetween(500, vehicles[vehicleIdx].maxLoad * 0.8);
    const fuelEstimate = route.dist * randomBetween(0.3, 0.45);

    const scheduledDate = daysAgo(Math.floor(Math.random() * 30));

    let dispatchedAt: Date | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    let cancelledAt: Date | null = null;
    let cancelReason: string | null = null;
    let actualDistance: number | null = null;
    let actualFuel: number | null = null;
    let fuelCost: number | null = null;

    if (status === 'DISPATCHED' || status === 'IN_TRANSIT' || status === 'COMPLETED') {
      dispatchedAt = new Date(scheduledDate.getTime() + 3600000);
    }
    if (status === 'IN_TRANSIT' || status === 'COMPLETED') {
      startedAt = new Date(scheduledDate.getTime() + 7200000);
    }
    if (status === 'COMPLETED') {
      completedAt = new Date(scheduledDate.getTime() + route.dist * 60000 * randomBetween(0.8, 1.2));
      actualDistance = route.dist * randomBetween(0.95, 1.08);
      actualFuel = fuelEstimate * randomBetween(0.9, 1.15);
      fuelCost = actualFuel * randomBetween(1.20, 1.80);
    }
    if (status === 'CANCELLED') {
      cancelledAt = new Date(scheduledDate.getTime() + 1800000);
      cancelReason = pick([
        'Vehicle breakdown before departure',
        'Client cancelled shipment',
        'Severe weather conditions on route',
      ]);
    }

    const trip = await prisma.trip.create({
      data: {
        tripNumber: tripNum,
        vehicleId: vehicles[vehicleIdx].id,
        driverId: drivers[driverIdx].id,
        source: route.source,
        destination: route.destination,
        cargoDescription: route.cargo,
        cargoWeight: weight,
        plannedDistance: route.dist,
        actualDistance,
        estimatedFuel: fuelEstimate,
        actualFuel,
        fuelCost,
        status,
        priority: pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'CRITICAL']),
        scheduledDate,
        dispatchedAt,
        startedAt,
        completedAt,
        cancelledAt,
        cancelReason,
        deliveryNotes: status === 'COMPLETED' ? pick(['Delivered on time', 'Slight delay at checkpoint', 'Customer signed off', 'Partial unload, remainder next trip', 'No issues reported']) : null,
        notes: status === 'DRAFT' ? 'Awaiting dispatch approval' : null,
      },
    });
    trips.push(trip);
  }

  console.log(`   Created ${trips.length} trips`);

  // ── Maintenance ────────────────────────────────────────────────────
  console.log('🔧 Creating maintenance records...');

  const maintenanceData = [
    { issue: 'Oil change and filter replacement', type: 'PREVENTIVE', desc: 'Regular 15,000 km oil change service with OEM filter', mechanic: 'Tony Ricci', cost: 180, priority: 'LOW', status: 'COMPLETED', dayOffset: -20 },
    { issue: 'Brake pad replacement', type: 'CORRECTIVE', desc: 'Front and rear brake pads worn below minimum thickness', mechanic: 'Tony Ricci', cost: 850, priority: 'HIGH', status: 'COMPLETED', dayOffset: -15 },
    { issue: 'Tire rotation and alignment', type: 'PREVENTIVE', desc: 'Rotate all tires and perform 4-wheel alignment check', mechanic: 'Dave Chen', cost: 250, priority: 'MEDIUM', status: 'COMPLETED', dayOffset: -10 },
    { issue: 'Engine diagnostic — misfiring cylinder', type: 'CORRECTIVE', desc: 'Cylinder 3 misfire detected via OBD-II. Investigating ignition coil and injector.', mechanic: 'Frank Mueller', cost: 1200, priority: 'HIGH', status: 'IN_PROGRESS', dayOffset: -3 },
    { issue: 'Transmission fluid flush', type: 'PREVENTIVE', desc: 'Scheduled 60,000 km transmission service', mechanic: 'Dave Chen', cost: 420, priority: 'MEDIUM', status: 'IN_PROGRESS', dayOffset: -2 },
    { issue: 'Air conditioning compressor failure', type: 'CORRECTIVE', desc: 'AC compressor seized. Full replacement required.', mechanic: 'Tony Ricci', cost: 2800, priority: 'MEDIUM', status: 'IN_PROGRESS', dayOffset: -1 },
    { issue: 'Transmission repair — gear slippage', type: 'EMERGENCY', desc: 'Emergency roadside repair after transmission failure on I-95', mechanic: 'Emergency Fleet Services', cost: 4800, priority: 'CRITICAL', status: 'SCHEDULED', dayOffset: 2 },
    { issue: 'Coolant system inspection', type: 'PREVENTIVE', desc: 'Inspect radiator, hoses, thermostat, and coolant levels', mechanic: 'Dave Chen', cost: 150, priority: 'LOW', status: 'SCHEDULED', dayOffset: 7 },
    { issue: 'Windshield replacement', type: 'CORRECTIVE', desc: 'Large crack across driver-side windshield from road debris', mechanic: 'AutoGlass Pros', cost: 650, priority: 'MEDIUM', status: 'SCHEDULED', dayOffset: 5 },
    { issue: 'Hydraulic lift system failure', type: 'EMERGENCY', desc: 'Trailer hydraulic lift stuck in up position, leaking fluid', mechanic: 'Emergency Fleet Services', cost: 3200, priority: 'CRITICAL', status: 'CANCELLED', dayOffset: -8 },
  ];

  const maintenanceRecords = [];
  for (let i = 0; i < maintenanceData.length; i++) {
    const m = maintenanceData[i];
    const vehicleIdx = i % vehicles.length;
    const scheduledDate = m.dayOffset < 0 ? daysAgo(Math.abs(m.dayOffset)) : daysFromNow(m.dayOffset);

    const record = await prisma.maintenance.create({
      data: {
        vehicleId: vehicles[vehicleIdx].id,
        type: m.type,
        issue: m.issue,
        description: m.desc,
        mechanic: m.mechanic,
        mechanicContact: m.mechanic === 'Emergency Fleet Services' ? '+1-800-555-FLEET' : `+1-555-09${String(i).padStart(2, '0')}`,
        cost: m.cost,
        priority: m.priority,
        status: m.status,
        scheduledDate,
        startedAt: m.status === 'IN_PROGRESS' || m.status === 'COMPLETED' ? new Date(scheduledDate.getTime() + 3600000) : null,
        completedAt: m.status === 'COMPLETED' ? new Date(scheduledDate.getTime() + 86400000) : null,
        notes: m.status === 'CANCELLED' ? 'Cancelled — vehicle retired before repair could begin' : null,
      },
    });
    maintenanceRecords.push(record);
  }

  console.log(`   Created ${maintenanceRecords.length} maintenance records`);

  // ── Fuel Logs ──────────────────────────────────────────────────────
  console.log('⛽ Creating fuel logs...');

  const fuelStations = [
    'Shell Highway 95', 'BP Transit Center', 'Chevron Depot', 'ExxonMobil Truck Stop',
    'Pilot Flying J #412', 'Love\'s Travel Stop', 'TA Petro #89', 'Casey\'s Fleet Services',
    'Speedway Diesel Hub', 'Circle K Commercial', 'QuikTrip Fleet Center', 'Wawa Express',
  ];

  const fuelLogs = [];
  for (let i = 0; i < 40; i++) {
    const vehicleIdx = i % vehicles.length;
    const driverIdx = i % drivers.length;
    const dayOffset = Math.floor(Math.random() * 60);
    const liters = randomBetween(40, 200);
    const costPerLiter = randomBetween(1.20, 1.80);
    const baseOdometer = vehicles[vehicleIdx].currentOdometer - (dayOffset * randomBetween(100, 400));

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: vehicles[vehicleIdx].id,
        driverId: drivers[driverIdx].id,
        liters,
        costPerLiter,
        totalCost: Math.round(liters * costPerLiter * 100) / 100,
        mileageAtFill: Math.max(baseOdometer, 10000),
        fuelStation: pick(fuelStations),
        fuelType: 'DIESEL',
        date: daysAgo(dayOffset),
        notes: i % 8 === 0 ? 'Topped off before long-haul route' : null,
      },
    });
    fuelLogs.push(log);
  }

  console.log(`   Created ${fuelLogs.length} fuel logs`);

  // ── Expenses ───────────────────────────────────────────────────────
  console.log('💰 Creating expenses...');

  const expenseTemplates = [
    { category: 'FUEL', desc: 'Diesel fuel bulk purchase', vendor: 'Shell Commercial', min: 200, max: 2500 },
    { category: 'FUEL', desc: 'Emergency fuel top-up', vendor: 'BP Transit Center', min: 50, max: 300 },
    { category: 'MAINTENANCE', desc: 'Scheduled engine service', vendor: 'FleetServ Auto', min: 300, max: 2000 },
    { category: 'MAINTENANCE', desc: 'Parts replacement — brake assembly', vendor: 'NAPA Auto Parts', min: 150, max: 800 },
    { category: 'TOLL', desc: 'Monthly highway toll pass', vendor: 'E-ZPass Commercial', min: 100, max: 500 },
    { category: 'TOLL', desc: 'Interstate toll charges', vendor: 'SunPass Fleet', min: 25, max: 150 },
    { category: 'INSURANCE', desc: 'Quarterly fleet insurance premium', vendor: 'Allianz Commercial', min: 3000, max: 8000 },
    { category: 'INSURANCE', desc: 'Supplemental cargo insurance', vendor: 'Zurich Fleet', min: 500, max: 2000 },
    { category: 'PARKING', desc: 'Overnight truck parking fees', vendor: 'SecurePark Lots', min: 20, max: 80 },
    { category: 'PARKING', desc: 'Terminal parking charges', vendor: 'Airport Cargo Parking', min: 30, max: 120 },
    { category: 'REPAIR', desc: 'Windshield repair', vendor: 'Safelite Fleet', min: 150, max: 600 },
    { category: 'REPAIR', desc: 'Roadside tire replacement', vendor: 'Bridgestone Fleet', min: 200, max: 1200 },
    { category: 'SALARY', desc: 'Driver monthly salary', vendor: 'TransitOps Payroll', min: 4000, max: 6500 },
    { category: 'SALARY', desc: 'Overtime pay — weekend routes', vendor: 'TransitOps Payroll', min: 500, max: 1500 },
    { category: 'MISC', desc: 'Driver meal allowance', vendor: 'Corporate Expense', min: 30, max: 150 },
    { category: 'MISC', desc: 'GPS tracking subscription', vendor: 'Samsara Fleet', min: 100, max: 400 },
    { category: 'FUEL', desc: 'CNG refueling — depot', vendor: 'Clean Energy Fuels', min: 100, max: 600 },
    { category: 'MAINTENANCE', desc: 'Tire rotation service', vendor: 'Goodyear Fleet', min: 120, max: 350 },
    { category: 'TOLL', desc: 'Bridge toll charges — George Washington Bridge', vendor: 'Port Authority', min: 50, max: 200 },
    { category: 'REPAIR', desc: 'Exhaust system patch repair', vendor: 'Midas Fleet Center', min: 200, max: 900 },
    { category: 'MISC', desc: 'Annual DOT inspection fees', vendor: 'State DMV', min: 75, max: 200 },
    { category: 'INSURANCE', desc: 'Workers compensation adjustment', vendor: 'Liberty Mutual', min: 1000, max: 3000 },
    { category: 'PARKING', desc: 'Monthly depot parking rental', vendor: 'Industrial Park LLC', min: 200, max: 500 },
    { category: 'SALARY', desc: 'Performance bonus — Q2', vendor: 'TransitOps Payroll', min: 500, max: 2000 },
    { category: 'FUEL', desc: 'Fleet fuel card charges — monthly', vendor: 'WEX Fleet Card', min: 1500, max: 5000 },
    { category: 'MAINTENANCE', desc: 'Battery replacement', vendor: 'Interstate Batteries', min: 150, max: 400 },
    { category: 'TOLL', desc: 'Tunnel toll fees — Lincoln Tunnel', vendor: 'Port Authority', min: 30, max: 100 },
    { category: 'REPAIR', desc: 'Transmission diagnostic and repair', vendor: 'AAMCO Fleet', min: 500, max: 3500 },
    { category: 'MISC', desc: 'Vehicle registration renewal', vendor: 'State DMV', min: 80, max: 250 },
    { category: 'MISC', desc: 'Freight documentation fees', vendor: 'FreightDocs Inc', min: 25, max: 100 },
  ];

  const expenses = [];
  for (let i = 0; i < 30; i++) {
    const t = expenseTemplates[i];
    const dayOffset = Math.floor(Math.random() * 90);
    const vehicleIdx = i % vehicles.length;
    const hasVehicle = t.category !== 'SALARY' && t.category !== 'MISC';

    const expense = await prisma.expense.create({
      data: {
        vehicleId: hasVehicle ? vehicles[vehicleIdx].id : null,
        category: t.category,
        amount: randomBetween(t.min, t.max),
        description: t.desc,
        vendor: t.vendor,
        date: daysAgo(dayOffset),
        approvedBy: pick([adminUser.name, safetyUser.name, financeUser.name]),
        notes: i % 5 === 0 ? 'Verified against receipt' : null,
      },
    });
    expenses.push(expense);
  }

  console.log(`   Created ${expenses.length} expenses`);

  // ── Notifications ──────────────────────────────────────────────────
  console.log('🔔 Creating notifications...');

  const notificationData = [
    { userId: adminUser.id, type: 'LICENSE_EXPIRY', title: 'License Expiring Soon', message: 'Driver Ahmed Hassan\'s CDL-A license expires in 25 days. Schedule renewal.', read: false, priority: 'HIGH', entity: 'driver', hoursAgo: 2 },
    { userId: adminUser.id, type: 'LICENSE_EXPIRY', title: 'License Expiring — Critical', message: 'Driver Dmitri Volkov\'s CDL-A license expires in 15 days. Immediate action required.', read: false, priority: 'CRITICAL', entity: 'driver', hoursAgo: 1 },
    { userId: adminUser.id, type: 'MAINTENANCE_DUE', title: 'Scheduled Maintenance Due', message: 'Vehicle TRK-004 is due for scheduled engine service. Currently 342,000 km.', read: true, priority: 'MEDIUM', entity: 'vehicle', hoursAgo: 48 },
    { userId: adminUser.id, type: 'TRIP_COMPLETED', title: 'Trip Completed', message: 'Trip TRP-20240301-1015 from New York to Chicago completed successfully.', read: true, priority: 'NORMAL', entity: 'trip', hoursAgo: 72 },
    { userId: adminUser.id, type: 'HIGH_EXPENSE', title: 'High Expense Alert', message: 'Quarterly fleet insurance premium of $7,450 exceeds budget threshold by 12%.', read: false, priority: 'HIGH', entity: 'expense', hoursAgo: 6 },
    { userId: driverUser.id, type: 'ASSIGNMENT', title: 'New Trip Assigned', message: 'You have been assigned trip from Houston to Dallas. Report to depot at 06:00.', read: false, priority: 'NORMAL', entity: 'trip', hoursAgo: 4 },
    { userId: driverUser.id, type: 'TRIP_COMPLETED', title: 'Trip Logged', message: 'Your trip from Miami to Atlanta has been marked as completed. Please submit fuel receipts.', read: true, priority: 'NORMAL', entity: 'trip', hoursAgo: 96 },
    { userId: driverUser.id, type: 'SYSTEM', title: 'Profile Update Required', message: 'Please update your emergency contact information in your profile.', read: false, priority: 'LOW', entity: 'user', hoursAgo: 168 },
    { userId: safetyUser.id, type: 'SAFETY_ALERT', title: 'Low Safety Score Alert', message: 'Driver Rebecca O\'Brien has a safety score of 65, below the 70-point threshold.', read: false, priority: 'CRITICAL', entity: 'driver', hoursAgo: 3 },
    { userId: safetyUser.id, type: 'SAFETY_ALERT', title: 'Vehicle Inspection Overdue', message: 'Vehicle TRL-011 has not been inspected in 45 days. Maximum interval is 30 days.', read: false, priority: 'HIGH', entity: 'vehicle', hoursAgo: 12 },
    { userId: safetyUser.id, type: 'MAINTENANCE_DUE', title: 'Emergency Repair Required', message: 'Vehicle TRK-004 reported transmission issues. Emergency maintenance scheduled.', read: true, priority: 'CRITICAL', entity: 'maintenance', hoursAgo: 24 },
    { userId: safetyUser.id, type: 'LICENSE_EXPIRY', title: 'Multiple Licenses Expiring', message: '3 driver licenses are expiring within the next 60 days. Review required.', read: false, priority: 'HIGH', entity: 'driver', hoursAgo: 8 },
    { userId: financeUser.id, type: 'HIGH_EXPENSE', title: 'Monthly Fuel Cost Exceeded', message: 'Fleet fuel costs for this month ($28,450) exceed the $25,000 budget by 13.8%.', read: false, priority: 'HIGH', entity: 'expense', hoursAgo: 5 },
    { userId: financeUser.id, type: 'HIGH_EXPENSE', title: 'Unexpected Repair Cost', message: 'Emergency transmission repair for TRK-004 cost $4,800 — not in quarterly budget.', read: false, priority: 'MEDIUM', entity: 'expense', hoursAgo: 10 },
    { userId: financeUser.id, type: 'TRIP_COMPLETED', title: 'Revenue Report Available', message: '7 trips completed this week generating estimated revenue of $34,200.', read: true, priority: 'NORMAL', entity: 'trip', hoursAgo: 24 },
    { userId: financeUser.id, type: 'SYSTEM', title: 'Quarterly Report Due', message: 'Q2 financial report is due in 5 days. Expense reconciliation pending.', read: false, priority: 'MEDIUM', entity: 'report', hoursAgo: 48 },
    { userId: allDriverUsers[1].id, type: 'LICENSE_EXPIRY', title: 'Your License Expires Soon', message: 'Your CDL-A license expires in 25 days. Please begin the renewal process immediately.', read: false, priority: 'HIGH', entity: 'driver', hoursAgo: 6 },
    { userId: allDriverUsers[3].id, type: 'LICENSE_EXPIRY', title: 'License Renewal Urgent', message: 'Your CDL-A license expires in 15 days. Contact dispatch for time off to renew.', read: false, priority: 'CRITICAL', entity: 'driver', hoursAgo: 3 },
    { userId: allDriverUsers[5].id, type: 'TRIP_COMPLETED', title: 'Great Safety Record', message: 'Congratulations! You\'ve maintained a perfect 100 safety score for 6 consecutive months.', read: true, priority: 'NORMAL', entity: 'driver', hoursAgo: 120 },
    { userId: allDriverUsers[6].id, type: 'SAFETY_ALERT', title: 'Safety Score Below Threshold', message: 'Your safety score (65) is below the company minimum of 70. A review meeting has been scheduled.', read: false, priority: 'HIGH', entity: 'driver', hoursAgo: 8 },
  ];

  for (const n of notificationData) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        priority: n.priority,
        linkedEntity: n.entity,
        createdAt: hoursAgo(n.hoursAgo),
      },
    });
  }

  console.log(`   Created ${notificationData.length} notifications`);

  // ── Summary ────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!');
  console.log('   Users:          13 (4 roles + 9 extra drivers)');
  console.log('   Vehicles:       15');
  console.log('   Drivers:        10');
  console.log('   Trips:          25');
  console.log('   Maintenance:    10');
  console.log('   Fuel Logs:      40');
  console.log('   Expenses:       30');
  console.log('   Notifications:  20');
  console.log('\n   Login credentials:');
  console.log('   admin@transitops.com    / TransitOps2024!  (Fleet Manager)');
  console.log('   driver@transitops.com   / TransitOps2024!  (Driver)');
  console.log('   safety@transitops.com   / TransitOps2024!  (Safety Officer)');
  console.log('   finance@transitops.com  / TransitOps2024!  (Financial Analyst)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
