'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDistance } from '@/lib/utils';
import {
  BarChart as ChartIcon, FileText, Calendar, TrendingUp,
  MapPin, DollarSign, Fuel, Loader2, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface ReportData {
  totalTrips: number;
  completedTrips: number;
  totalExpenses: number;
  totalFuel: number;
  avgFuelEfficiency: number;
  expensesByCategory: { category: string; amount: number }[];
  tripsByStatus: { status: string; count: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  topVehicles: { reg: string; count: number }[];
  topDrivers: { name: string; count: number }[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#94a3b8'];

export default function ReportsPage() {
  const { user } = useAuth();
  
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoObj = new Date();
  thirtyDaysAgoObj.setDate(thirtyDaysAgoObj.getDate() - 30);
  const thirtyDaysAgo = thirtyDaysAgoObj.toISOString().split('T')[0];

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [url, setUrl] = useState(`/api/reports?from=${thirtyDaysAgo}&to=${today}`);

  const { data: report, loading, refetch } = useFetch<ReportData>(url);

  // Trigger refetch when dates change
  const handleApply = () => {
    setUrl(`/api/reports?from=${from}&to=${to}`);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Generate business intelligence reports, inspect expense flows, and review driver milestones.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="filter-bar glass-card-static" style={{ padding: '14px 20px', gap: '16px', alignItems: 'center' }}>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-muted" />
          <span className="text-sm text-muted font-medium uppercase">Date Filter</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap" style={{ flex: 1 }}>
          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <span className="text-xs text-muted">From</span>
            <input
              type="date"
              className="input-field"
              style={{ width: '160px', padding: '8px 12px' }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <span className="text-xs text-muted">To</span>
            <input
              type="date"
              className="input-field"
              style={{ width: '160px', padding: '8px 12px' }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" style={{ height: '38px', padding: '0 20px' }} onClick={handleApply}>
            Apply Range
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '300px' }}>
          <Loader2 size={36} className="animate-spin text-muted" />
        </div>
      ) : !report ? (
        <div className="empty-state glass-card">
          <div className="empty-state-icon"><FileText size={40} /></div>
          <h3 className="empty-state-title">No report generated</h3>
        </div>
      ) : (
        <div className="flex flex-col gap-6" style={{ marginTop: '24px' }}>
          {/* KPI Dashboard */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Shipments</span>
                <div className="stat-card-icon primary"><MapPin size={20} /></div>
              </div>
              <div className="stat-card-value">{report.totalTrips}</div>
              <div className="stat-card-change positive">
                {report.completedTrips} successfully completed ({report.totalTrips > 0 ? Math.round((report.completedTrips / report.totalTrips) * 100) : 0}%)
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Expenses</span>
                <div className="stat-card-icon danger"><DollarSign size={20} /></div>
              </div>
              <div className="stat-card-value">{formatCurrency(report.totalExpenses)}</div>
              <div className="stat-card-change positive">Tolls, maintenance & fuel costs</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Fuel Logged</span>
                <div className="stat-card-icon warning"><Fuel size={20} /></div>
              </div>
              <div className="stat-card-value">{report.totalFuel.toLocaleString()} L</div>
              <div className="stat-card-change positive">Refilled inside range</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Avg Fuel Efficiency</span>
                <div className="stat-card-icon info"><TrendingUp size={20} /></div>
              </div>
              <div className="stat-card-value">{report.avgFuelEfficiency.toFixed(2)} L/100km</div>
              <div className="stat-card-change positive">Lower values represent high efficiency</div>
            </div>
          </div>

          {/* Core Chart Grids */}
          <div className="charts-grid">
            {/* Monthly Trend */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Expense Trend (Last 6 Months)</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={report.monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} name="Expenses ($)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Expenses splits */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Expenses by Category</h3>
              </div>
              {report.expensesByCategory.length === 0 ? (
                <div className="flex justify-center items-center text-muted" style={{ height: '240px' }}>No expense records in range</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={report.expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="amount"
                      nameKey="category"
                    >
                      {report.expensesByCategory.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
            {/* Category Expenses Breakdown Bar */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Category Expenses Breakdown</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={report.expensesByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="Spent ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Shipments status splits */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Trips Status Split</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={report.tripsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                  >
                    {report.tripsByStatus.map((_, index) => (
                      <Cell key={index} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance split */}
          <div className="charts-grid">
            {/* Top Vehicles */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Top 5 Vehicles by completed shipments</h3>
              </div>
              {report.topVehicles.length === 0 ? (
                <div className="flex justify-center items-center text-muted" style={{ height: '200px' }}>No completed shipments</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={report.topVehicles} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="reg" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Completed Trips" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Drivers */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Top 5 Drivers by completed shipments</h3>
              </div>
              {report.topDrivers.length === 0 ? (
                <div className="flex justify-center items-center text-muted" style={{ height: '200px' }}>No completed shipments</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={report.topDrivers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Completed Trips" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
