import { z } from 'zod';

// ── Auth ───────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').trim(),
  role: z.enum(['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']).default('DRIVER'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// ── Vehicle ────────────────────────────────────────────────────────────

export const vehicleSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required').trim().toUpperCase(),
  make: z.string().min(1, 'Make is required').trim(),
  model: z.string().min(1, 'Model is required').trim(),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  type: z.enum(['TRUCK', 'VAN', 'TRAILER', 'BUS']).default('TRUCK'),
  maxLoad: z.coerce.number().min(0, 'Max load must be non-negative').default(0),
  fuelType: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'HYBRID', 'CNG']).default('DIESEL'),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'RETIRED']).default('ACTIVE'),
  vin: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  currentOdometer: z.coerce.number().min(0).default(0),
  acquisitionCost: z.coerce.number().min(0).default(0),
  acquisitionDate: z.coerce.date().optional().nullable(),
  insuranceExpiry: z.coerce.date().optional().nullable(),
  insuranceProvider: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

// ── Driver ─────────────────────────────────────────────────────────────

export const driverSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required').trim(),
  licenseNumber: z.string().min(1, 'License number is required').trim(),
  licenseExpiry: z.coerce.date({ error: 'Valid license expiry date is required' }),
  licenseType: z.string().trim().min(1).default('CDL-A'),
  experience: z.coerce.number().int().min(0).default(0),
  safetyScore: z.coerce.number().min(0).max(100).default(100),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'SUSPENDED', 'OFF_DUTY']).default('AVAILABLE'),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  emergencyContact: z.string().trim().optional().nullable(),
  emergencyPhone: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});
export type DriverInput = z.infer<typeof driverSchema>;

// ── Trip ───────────────────────────────────────────────────────────────

export const tripSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  source: z.string().min(1, 'Source is required').trim(),
  destination: z.string().min(1, 'Destination is required').trim(),
  cargoDescription: z.string().trim().optional().nullable(),
  cargoWeight: z.coerce.number().min(0, 'Cargo weight must be non-negative').default(0),
  plannedDistance: z.coerce.number().min(0).default(0),
  estimatedFuel: z.coerce.number().min(0).default(0),
  scheduledDate: z.coerce.date().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  notes: z.string().trim().optional().nullable(),
});
export type TripInput = z.infer<typeof tripSchema>;

// ── Maintenance ────────────────────────────────────────────────────────

export const maintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']).default('PREVENTIVE'),
  issue: z.string().min(1, 'Issue description is required').trim(),
  description: z.string().trim().optional().nullable(),
  mechanic: z.string().trim().optional().nullable(),
  cost: z.coerce.number().min(0, 'Cost must be non-negative').default(0),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  scheduledDate: z.coerce.date({ error: 'Scheduled date is required' }),
});
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

// ── Fuel Log ───────────────────────────────────────────────────────────

export const fuelLogSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().optional().nullable(),
  liters: z.coerce.number().positive('Liters must be positive'),
  costPerLiter: z.coerce.number().positive('Cost per liter must be positive'),
  totalCost: z.coerce.number().min(0, 'Total cost must be non-negative'),
  mileageAtFill: z.coerce.number().min(0).default(0),
  fuelStation: z.string().trim().optional().nullable(),
  date: z.coerce.date({ error: 'Date is required' }),
  notes: z.string().trim().optional().nullable(),
});
export type FuelLogInput = z.infer<typeof fuelLogSchema>;

// ── Expense ────────────────────────────────────────────────────────────

export const expenseSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  category: z.enum(['MAINTENANCE', 'FUEL', 'TOLL', 'INSURANCE', 'PARKING', 'REPAIR', 'SALARY', 'MISC']),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().trim().optional().nullable(),
  vendor: z.string().trim().optional().nullable(),
  date: z.coerce.date({ error: 'Date is required' }),
  notes: z.string().trim().optional().nullable(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
