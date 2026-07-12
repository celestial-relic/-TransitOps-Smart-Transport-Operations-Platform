'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useFetch } from '@/hooks/useFetch';
import { UserRole, hasPermission } from '@/lib/constants';
import { formatCurrency, formatDate, classNames } from '@/lib/utils';
import {
  Truck, Route, DollarSign, Gauge, TrendingUp, TrendingDown,
  Plus, ArrowRight, Clock, MapPin, Activity, AlertTriangle,
  Users, Wrench, X
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';

interface DashboardStats {
  totalVehicles: number;
  vehicleChange: number;
  activeTrips: number;
  tripChange: number;
  monthlyRevenue: number;
  revenueChange: number;
  fleetUtilization: number;
  utilizationChange: number;
  tripActivity: { date: string; trips: number; completed: number }[];
  expenseBreakdown: { category: string; amount: number }[];
  recentTrips: {
    id: string;
    tripNumber: string;
    source: string;
    destination: string;
    status: string;
    scheduledDate: string;
    driver?: { user: { name: string } };
  }[];
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: 'badge badge-neutral',
    DISPATCHED: 'badge badge-info',
    IN_TRANSIT: 'badge badge-primary',
    COMPLETED: 'badge badge-success',
    CANCELLED: 'badge badge-danger',
  };
  return map[status] || 'badge badge-neutral';
};

function ToastContainer({ toasts, removeToast }: { toasts: { id: string; type: string; message: string }[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8125rem' }}>
      <p style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('amount') ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8125rem' }}>
      <p style={{ color: payload[0].payload.category, fontWeight: 600 }}>
        {payload[0].name}: {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DashboardPage() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const { data: stats, loading } = useFetch<DashboardStats>('/api/dashboard/stats');
  const [quickAction, setQuickAction] = useState<string | null>(null);

  useEffect(() => {
    if (quickAction) {
      addToast(`Navigating to ${quickAction}...`, 'info');
      setQuickAction(null);
    }
  }, [quickAction, addToast]);

  const isFleetManager = user?.role === UserRole.FLEET_MANAGER;

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" style={{ width: 300 }} />
          </div>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
        <div className="charts-grid">
          <div className="skeleton skeleton-chart" />
          <div className="skeleton skeleton-chart" />
        </div>
      </div>
    );
  }

  const data = stats || {
    totalVehicles: 0, vehicleChange: 0,
    activeTrips: 0, tripChange: 0,
    monthlyRevenue: 0, revenueChange: 0,
    fleetUtilization: 0, utilizationChange: 0,
    tripActivity: [], expenseBreakdown: [], recentTrips: [],
  };

  const statCards = [
    {
      label: 'Total Vehicles',
      value: data.totalVehicles.toString(),
      change: data.vehicleChange,
      icon: <Truck size={20} />,
      color: 'primary',
    },
    {
      label: 'Active Trips',
      value: data.activeTrips.toString(),
      change: data.tripChange,
      icon: <Route size={20} />,
      color: 'info',
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(data.monthlyRevenue),
      change: data.revenueChange,
      icon: <DollarSign size={20} />,
      color: 'success',
    },
    {
      label: 'Fleet Utilization',
      value: `${data.fleetUtilization}%`,
      change: data.utilizationChange,
      icon: <Gauge size={20} />,
      color: 'warning',
    },
  ];

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name || 'User'}. Here&apos;s your fleet overview.
          </p>
        </div>
        {isFleetManager && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => window.location.href = '/trips'}>
              <Plus size={16} /> New Trip
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">{card.label}</span>
              <div className={`stat-card-icon ${card.color}`}>{card.icon}</div>
            </div>
            <div className="stat-card-value">{card.value}</div>
            <div className={classNames('stat-card-change', card.change >= 0 ? 'positive' : 'negative')}>
              {card.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(card.change)}% vs last month
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Trip Activity</h3>
            <span className="text-muted text-sm">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.tripActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '0.8125rem', color: '#94a3b8' }} />
              <Line type="monotone" dataKey="trips" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name="Total Trips" />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Expense Breakdown</h3>
            <span className="text-muted text-sm">This month</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.expenseBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="amount"
                nameKey="category"
              >
                {data.expenseBreakdown.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8125rem', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="charts-grid">
        <div className="glass-card-static" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Trips</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => window.location.href = '/trips'}>
                View All <ArrowRight size={14} />
              </button>
            </div>
          </div>
          {data.recentTrips.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon"><Route size={32} /></div>
              <p className="empty-state-title">No recent trips</p>
              <p className="empty-state-text">Create your first trip to get started.</p>
            </div>
          ) : (
            <div>
              {data.recentTrips.map((trip) => (
                <div key={trip.id} className="notification-item" style={{ cursor: 'default' }}>
                  <div className="notification-dot info" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <span className="font-semibold text-sm">{trip.tripNumber}</span>
                      <span className={statusBadge(trip.status)}>{trip.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted text-xs">
                      <MapPin size={12} />
                      <span className="truncate">{trip.source} → {trip.destination}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      {trip.driver && <span><Users size={11} /> {trip.driver.user.name}</span>}
                      {trip.scheduledDate && <span><Clock size={11} /> {formatDate(trip.scheduledDate)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isFleetManager && (
          <div className="glass-card-static" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Add Vehicle', icon: <Truck size={18} />, href: '/vehicles', color: 'var(--primary)' },
                { label: 'Schedule Maintenance', icon: <Wrench size={18} />, href: '/maintenance', color: 'var(--warning)' },
                { label: 'Create Trip', icon: <Route size={18} />, href: '/trips', color: 'var(--info)' },
                { label: 'Log Expense', icon: <DollarSign size={18} />, href: '/expenses', color: 'var(--success)' },
                { label: 'View Alerts', icon: <AlertTriangle size={18} />, href: '/notifications', color: 'var(--danger)' },
                { label: 'Fleet Reports', icon: <Activity size={18} />, href: '/reports', color: '#8b5cf6' },
              ].map((action) => (
                <button
                  key={action.label}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px' }}
                  onClick={() => window.location.href = action.href}
                >
                  <span style={{ color: action.color }}>{action.icon}</span>
                  {action.label}
                  <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {!isFleetManager && (
          <div className="glass-card-static" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Your Overview</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between" style={{ padding: '12px 16px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex items-center gap-3">
                  <Activity size={18} style={{ color: 'var(--primary)' }} />
                  <span className="text-sm font-medium">Role</span>
                </div>
                <span className="badge badge-primary">{user?.role?.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between" style={{ padding: '12px 16px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex items-center gap-3">
                  <Clock size={18} style={{ color: 'var(--info)' }} />
                  <span className="text-sm font-medium">Today</span>
                </div>
                <span className="text-sm text-muted">{formatDate(new Date())}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
