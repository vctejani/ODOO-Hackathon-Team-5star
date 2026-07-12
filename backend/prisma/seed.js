import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TransitOps database...');

  const password = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'fleet@transitops.com', name: 'Sarah Chen', role: 'FLEET_MANAGER' },
    { email: 'driver@transitops.com', name: 'Alex Rivera', role: 'DRIVER' },
    { email: 'safety@transitops.com', name: 'James Wilson', role: 'SAFETY_OFFICER' },
    { email: 'finance@transitops.com', name: 'Maria Santos', role: 'FINANCIAL_ANALYST' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password },
    });
  }

  const van05 = await prisma.vehicle.upsert({
    where: { registrationNumber: 'VAN-05' },
    update: {},
    create: {
      registrationNumber: 'VAN-05',
      name: 'Van-05',
      type: 'Van',
      maxLoadCapacity: 500,
      odometer: 12500,
      acquisitionCost: 35000,
      status: 'AVAILABLE',
      region: 'North',
    },
  });

  const vehicles = [
    { registrationNumber: 'TRK-01', name: 'Freightliner Cascadia', type: 'Truck', maxLoadCapacity: 5000, odometer: 45000, acquisitionCost: 120000, region: 'East' },
    { registrationNumber: 'VAN-12', name: 'Mercedes Sprinter', type: 'Van', maxLoadCapacity: 800, odometer: 22000, acquisitionCost: 45000, region: 'West' },
    { registrationNumber: 'TRK-07', name: 'Volvo FH16', type: 'Truck', maxLoadCapacity: 8000, odometer: 78000, acquisitionCost: 150000, region: 'South' },
    { registrationNumber: 'VAN-03', name: 'Ford Transit', type: 'Van', maxLoadCapacity: 600, odometer: 15000, acquisitionCost: 32000, region: 'North' },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: {},
      create: { ...v, status: 'AVAILABLE' },
    });
  }

  const alex = await prisma.driver.upsert({
    where: { licenseNumber: 'DL-ALEX-2024' },
    update: {},
    create: {
      name: 'Alex Rivera',
      licenseNumber: 'DL-ALEX-2024',
      licenseCategory: 'B+C',
      licenseExpiry: new Date('2027-06-15'),
      contactNumber: '+1-555-0101',
      safetyScore: 95,
      status: 'AVAILABLE',
    },
  });

  const drivers = [
    { name: 'Jordan Lee', licenseNumber: 'DL-JL-2023', licenseCategory: 'C', licenseExpiry: new Date('2026-08-20'), contactNumber: '+1-555-0102', safetyScore: 88 },
    { name: 'Sam Patel', licenseNumber: 'DL-SP-2022', licenseCategory: 'B', licenseExpiry: new Date('2026-03-10'), contactNumber: '+1-555-0103', safetyScore: 92 },
    { name: 'Chris Morgan', licenseNumber: 'DL-CM-2021', licenseCategory: 'C+E', licenseExpiry: new Date('2025-07-01'), contactNumber: '+1-555-0104', safetyScore: 78 },
    { name: 'Taylor Brooks', licenseNumber: 'DL-TB-2024', licenseCategory: 'B', licenseExpiry: new Date('2028-01-15'), contactNumber: '+1-555-0105', safetyScore: 97 },
  ];

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { licenseNumber: d.licenseNumber },
      update: {},
      create: { ...d, status: 'AVAILABLE' },
    });
  }

  await prisma.fuelLog.create({
    data: { vehicleId: van05.id, liters: 45, cost: 67.5, date: new Date('2026-06-01') },
  });
  await prisma.fuelLog.create({
    data: { vehicleId: van05.id, liters: 38, cost: 57, date: new Date('2026-06-15') },
  });

  await prisma.fuelPrice.upsert({
    where: { id: 'current' },
    update: {},
    create: { id: 'current', pricePerLiter: 1.5 },
  });

  console.log('Seed complete!');
  console.log('\nDemo accounts (password: password123):');
  users.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
