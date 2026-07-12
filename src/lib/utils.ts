import { STATUS_COLORS } from './constants';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatFuelEfficiency(liters: number, km: number): string {
  if (km === 0) return '0.00 L/100km';
  const efficiency = (liters / km) * 100;
  return `${efficiency.toFixed(2)} L/100km`;
}

export function generateTripNumber(): string {
  const now = new Date();
  const datePart = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000).toString();
  return `TRP-${datePart}-${rand}`;
}

export function generateEmployeeId(): string {
  const rand = Math.floor(1000 + Math.random() * 9000).toString();
  return `EMP-${rand}`;
}

export function calculateFuelEfficiency(liters: number, distance: number): number {
  if (distance === 0) return 0;
  return parseFloat(((liters / distance) * 100).toFixed(2));
}

export function calculateCostPerKm(totalCost: number, distance: number): number {
  if (distance === 0) return 0;
  return parseFloat((totalCost / distance).toFixed(2));
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'gray';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export function daysBetween(date1: Date, date2: Date): number {
  const ms = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isExpired(date: Date): boolean {
  return new Date(date) < new Date();
}

export function isExpiringSoon(date: Date, days: number = 30): boolean {
  const now = new Date();
  const target = new Date(date);
  if (target < now) return true;
  const diff = daysBetween(now, target);
  return diff <= days;
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
