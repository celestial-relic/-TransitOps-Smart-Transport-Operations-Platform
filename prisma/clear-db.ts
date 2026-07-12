import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Erasing all dummy data...');

  // Delete all records in dependency order
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

  console.log('✅ All dummy data deleted successfully');

  console.log('👤 Creating default Administrator account...');

  const passwordHash = await bcrypt.hash('TransitOps2024!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@transitops.com',
      passwordHash,
      name: 'Administrator',
      role: 'FLEET_MANAGER',
      active: true,
    },
  });

  console.log('🚀 Real-world database initialized successfully!');
  console.log(`   Admin Login Email:    ${admin.email}`);
  console.log('   Admin Login Password: TransitOps2024!');
}

main()
  .catch((e) => {
    console.error('❌ Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
