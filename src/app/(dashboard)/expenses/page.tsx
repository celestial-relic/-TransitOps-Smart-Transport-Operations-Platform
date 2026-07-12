'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  DollarSign, Plus, X, Search, Calendar, FileText,
  PieChart as PieIcon, BarChart as BarIcon, Tag, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';

interface Vehicle {
  id: string;
  registrationNumber: string;
}

interface Expense {
  id: string;
  vehicleId: string | null;
  category: string;
  amount: number;
  description: string | null;
  vendor: string | null;
  date: string;
  approvedBy: string | null;
  vehicle: {
    registrationNumber: string;
  } | null;
}

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#94a3b8'];

export default function ExpensesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [url, setUrl] = useState('/api/expenses');

  const { data: expenses, loading, refetch } = useFetch<Expense[]>(url);

  // Update url when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
    setUrl(`/api/expenses?${params.toString()}`);
  }, [categoryFilter]);

  // Form / Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Select list
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Add Form State
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState('MISC');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load vehicles
  useEffect(() => {
    async function fetchVehicles() {
      try {
        const res = await fetch('/api/vehicles');
        if (res.ok) {
          const vData = await res.json();
          setVehicles(Array.isArray(vData) ? vData : vData.vehicles || []);
        }
      } catch {
        /* silent */
      }
    }
    fetchVehicles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount || !date) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicleId || null,
          category,
          amount: parseFloat(amount),
          description,
          vendor,
          date: new Date(date),
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to log expense');
      }

      addToast('Expense logged successfully', 'success');
      setIsAddModalOpen(false);
      refetch();
      // Reset form
      setVehicleId('');
      setCategory('MISC');
      setAmount('');
      setDescription('');
      setVendor('');
      setDate('');
      setNotes('');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Aggregations
  const totalSpend = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

  // Chart data: expense splits by category
  const getPieData = () => {
    if (!expenses) return [];
    const splits: Record<string, number> = {};
    expenses.forEach((e) => {
      splits[e.category] = (splits[e.category] ?? 0) + e.amount;
    });

    return Object.entries(splits).map(([cat, amt]) => ({
      name: cat,
      value: Math.round(amt),
    }));
  };

  const pieData = getPieData();

  // Chart data: Monthly expenses trend (last 6 months or group by date)
  const getTrendData = () => {
    if (!expenses) return [];
    const trendMap: Record<string, number> = {};
    
    // Last 6 months keys
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short' });
      trendMap[key] = 0;
    }

    expenses.forEach((e) => {
      const key = new Date(e.date).toLocaleString('default', { month: 'short' });
      if (trendMap[key] !== undefined) {
        trendMap[key] += e.amount;
      }
    });

    return Object.entries(trendMap).map(([month, amount]) => ({
      name: month,
      amount: Math.round(amount),
    }));
  };

  const trendData = getTrendData();

  const isFinancialOrManager = user?.role === 'FLEET_MANAGER' || user?.role === 'FINANCIAL_ANALYST';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track, audit, and categorize logistics costs including fuel, tolls, and maintenance.</p>
        </div>
        {isFinancialOrManager && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} /> Log Expense
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 3fr' }}>
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="stat-card-label">Total Spent (Range)</span>
          <div className="stat-card-value" style={{ fontSize: '2rem', marginTop: '10px' }}>
            {formatCurrency(totalSpend)}
          </div>
          <span className="text-xs text-muted" style={{ marginTop: '10px' }}>Aggregated across all categories</span>
        </div>

        <div className="glass-card-static" style={{ padding: '20px', display: 'flex', gap: '20px', overflowX: 'auto' }}>
          {pieData.map((d, i) => (
            <div key={d.name} className="flex flex-col justify-center" style={{ minWidth: '100px', borderRight: i < pieData.length - 1 ? '1px solid var(--glass-border)' : 'none', paddingRight: '15px' }}>
              <span className="text-xs text-muted font-medium flex items-center gap-1">
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                {d.name}
              </span>
              <span className="text-sm font-semibold text-mono" style={{ marginTop: '6px' }}>{formatCurrency(d.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="input-field"
          style={{ width: '180px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="FUEL">Fuel</option>
          <option value="TOLL">Tolls</option>
          <option value="INSURANCE">Insurance</option>
          <option value="PARKING">Parking</option>
          <option value="REPAIR">Repairs</option>
          <option value="SALARY">Salaries</option>
          <option value="MISC">Miscellaneous</option>
        </select>
      </div>

      {/* Split table & charts */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1.2fr' }}>
        {loading ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Vehicle</th>
                  <th>Description</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={6}><div className="skeleton skeleton-row" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : expenses?.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-state-icon"><DollarSign size={40} /></div>
            <h3 className="empty-state-title">No expenses found</h3>
            <p className="empty-state-text">Logged expenses will appear here.</p>
          </div>
        ) : (
          <div className="table-container glass-card-static">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Vehicle</th>
                  <th>Vendor / Details</th>
                  <th>Audited By</th>
                </tr>
              </thead>
              <tbody>
                {expenses?.map((e) => (
                  <tr key={e.id}>
                    <td><span className="text-sm">{formatDate(e.date)}</span></td>
                    <td>
                      <span className="badge badge-primary flex items-center gap-1" style={{ width: 'fit-content' }}>
                        <Tag size={10} />
                        {e.category}
                      </span>
                    </td>
                    <td className="text-mono font-semibold">{formatCurrency(e.amount)}</td>
                    <td>
                      {e.vehicle ? (
                        <span className="text-mono text-sm font-semibold">{e.vehicle.registrationNumber}</span>
                      ) : (
                        <span className="text-xs text-muted">Fleet Global</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{e.description || 'No description'}</span>
                        <span className="text-xs text-muted">{e.vendor || 'Unknown vendor'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-muted">{e.approvedBy || 'System'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Expense Category Chart */}
        <div className="flex flex-col gap-4">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3 className="chart-card-title">Monthly Spending Trend</h3>
              <span className="text-muted text-sm">Last 6 Months</span>
            </div>
            {trendData.length === 0 ? (
              <div className="empty-state" style={{ height: '180px' }}>
                <p className="empty-state-text">No spending trend data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="Amount ($)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Log New Expense</h3>
              <button className="btn-ghost" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">Vehicle (Optional)</label>
                    <select
                      className="input-field"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                    >
                      <option value="">Fleet Global (No vehicle)</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>{v.registrationNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select
                      className="input-field"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="FUEL">Fuel</option>
                      <option value="TOLL">Tolls</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="PARKING">Parking</option>
                      <option value="REPAIR">Repairs</option>
                      <option value="SALARY">Salaries</option>
                      <option value="MISC">Miscellaneous</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Vendor / Merchant</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. National Tolls Inc."
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                    />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">Description / Work Details</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Toll road refNY-120"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">Internal Notes</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Auditing notes, transaction references…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Logging Expense...' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
