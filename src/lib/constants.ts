// ── Enums ──────────────────────────────────────────────────────────────

export const UserRole = {
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const VehicleStatus = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const VehicleType = {
  TRUCK: 'TRUCK',
  VAN: 'VAN',
  TRAILER: 'TRAILER',
  BUS: 'BUS',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const FuelType = {
  DIESEL: 'DIESEL',
  PETROL: 'PETROL',
  ELECTRIC: 'ELECTRIC',
  HYBRID: 'HYBRID',
  CNG: 'CNG',
} as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];

export const DriverStatus = {
  AVAILABLE: 'AVAILABLE',
  ON_TRIP: 'ON_TRIP',
  SUSPENDED: 'SUSPENDED',
  OFF_DUTY: 'OFF_DUTY',
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const TripStatus = {
  DRAFT: 'DRAFT',
  DISPATCHED: 'DISPATCHED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus];

export const MaintenanceStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

export const MaintenanceType = {
  PREVENTIVE: 'PREVENTIVE',
  CORRECTIVE: 'CORRECTIVE',
  EMERGENCY: 'EMERGENCY',
} as const;
export type MaintenanceType = (typeof MaintenanceType)[keyof typeof MaintenanceType];

export const Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const ExpenseCategory = {
  MAINTENANCE: 'MAINTENANCE',
  FUEL: 'FUEL',
  TOLL: 'TOLL',
  INSURANCE: 'INSURANCE',
  PARKING: 'PARKING',
  REPAIR: 'REPAIR',
  SALARY: 'SALARY',
  MISC: 'MISC',
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const NotificationType = {
  LICENSE_EXPIRY: 'LICENSE_EXPIRY',
  MAINTENANCE_DUE: 'MAINTENANCE_DUE',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  HIGH_EXPENSE: 'HIGH_EXPENSE',
  SAFETY_ALERT: 'SAFETY_ALERT',
  ASSIGNMENT: 'ASSIGNMENT',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ── Navigation mapping per role ────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
  FLEET_MANAGER: [
    { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
    { label: 'Vehicles', href: '/vehicles', icon: 'Truck' },
    { label: 'Drivers', href: '/drivers', icon: 'Users' },
    { label: 'Trips', href: '/trips', icon: 'MapPin' },
    { label: 'Maintenance', href: '/maintenance', icon: 'Wrench' },
    { label: 'Fuel Logs', href: '/fuel', icon: 'Fuel' },
    { label: 'Expenses', href: '/expenses', icon: 'DollarSign' },
    { label: 'Documents', href: '/documents', icon: 'FileText' },
    { label: 'Reports', href: '/reports', icon: 'BarChart' },
    { label: 'AI Insights', href: '/insights', icon: 'Brain' },
    { label: 'Notifications', href: '/notifications', icon: 'Bell' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  DRIVER: [
    { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
    { label: 'My Trips', href: '/trips', icon: 'MapPin' },
    { label: 'Fuel Logs', href: '/fuel', icon: 'Fuel' },
    { label: 'Notifications', href: '/notifications', icon: 'Bell' },
    { label: 'Profile', href: '/profile', icon: 'User' },
  ],
  SAFETY_OFFICER: [
    { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
    { label: 'Drivers', href: '/drivers', icon: 'Users' },
    { label: 'Vehicles', href: '/vehicles', icon: 'Truck' },
    { label: 'Maintenance', href: '/maintenance', icon: 'Wrench' },
    { label: 'Reports', href: '/reports', icon: 'BarChart' },
    { label: 'Notifications', href: '/notifications', icon: 'Bell' },
  ],
  FINANCIAL_ANALYST: [
    { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
    { label: 'Expenses', href: '/expenses', icon: 'DollarSign' },
    { label: 'Fuel Logs', href: '/fuel', icon: 'Fuel' },
    { label: 'Reports', href: '/reports', icon: 'BarChart' },
    { label: 'AI Insights', href: '/insights', icon: 'Brain' },
    { label: 'Notifications', href: '/notifications', icon: 'Bell' },
  ],
};

// ── Permissions mapping per role ───────────────────────────────────────

export type CrudOp = 'create' | 'read' | 'update' | 'delete';
export type Entity =
  | 'vehicle'
  | 'driver'
  | 'trip'
  | 'maintenance'
  | 'fuel_log'
  | 'expense'
  | 'notification'
  | 'report'
  | 'user';

export const ROLE_PERMISSIONS: Record<UserRole, Partial<Record<Entity, CrudOp[]>>> = {
  FLEET_MANAGER: {
    vehicle: ['create', 'read', 'update', 'delete'],
    driver: ['create', 'read', 'update', 'delete'],
    trip: ['create', 'read', 'update', 'delete'],
    maintenance: ['create', 'read', 'update', 'delete'],
    fuel_log: ['create', 'read', 'update', 'delete'],
    expense: ['create', 'read', 'update', 'delete'],
    notification: ['read', 'update'],
    report: ['read'],
    user: ['create', 'read', 'update', 'delete'],
  },
  DRIVER: {
    vehicle: ['read'],
    driver: ['read'],
    trip: ['read'],
    maintenance: ['read'],
    fuel_log: ['create', 'read'],
    expense: ['read'],
    notification: ['read', 'update'],
    report: [],
    user: ['read', 'update'],
  },
  SAFETY_OFFICER: {
    vehicle: ['read', 'update'],
    driver: ['read', 'update'],
    trip: ['read'],
    maintenance: ['create', 'read', 'update'],
    fuel_log: ['read'],
    expense: ['read'],
    notification: ['read', 'update'],
    report: ['read'],
    user: ['read'],
  },
  FINANCIAL_ANALYST: {
    vehicle: ['read'],
    driver: ['read'],
    trip: ['read'],
    maintenance: ['read'],
    fuel_log: ['read'],
    expense: ['create', 'read', 'update'],
    notification: ['read', 'update'],
    report: ['read'],
    user: ['read'],
  },
};

export function hasPermission(role: UserRole, entity: Entity, op: CrudOp): boolean {
  const perms = ROLE_PERMISSIONS[role]?.[entity];
  return perms ? perms.includes(op) : false;
}

// ── Status color mapping ───────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green',
  MAINTENANCE: 'orange',
  RETIRED: 'red',
  AVAILABLE: 'green',
  ON_TRIP: 'blue',
  SUSPENDED: 'red',
  OFF_DUTY: 'gray',
  DRAFT: 'gray',
  DISPATCHED: 'blue',
  IN_TRANSIT: 'indigo',
  COMPLETED: 'green',
  CANCELLED: 'red',
  SCHEDULED: 'blue',
  IN_PROGRESS: 'orange',
  LOW: 'gray',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};
