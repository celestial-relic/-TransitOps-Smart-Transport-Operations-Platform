'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Fuel, Plus, X, Search, Calendar, MapPin, Gauge,
  Activity, BarChart as ChartIcon, FileText
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface FuelLog {
  id: string;
  vehicleId: string;
  driverId: string | null;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  mileageAtFill: number;
  fuelStation: string | null;
  date: string;
  notes: string | null;
  vehicle: {
    registrationNumber: string;
    make: string;
    model: string;
  };
  driver: {
    user: {
      name: string;
    };
  } | null;
}

export default function FuelPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [url, setUrl] = useState('/api/fuel');

  const { data: logs, loading, refetch } = useFetch<FuelLog[]>(url);

  // Update url when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (vehicleFilter) params.append('vehicleId', vehicleFilter);
    setUrl(`/api/fuel?${params.toString()}`);
  }, [vehicleFilter]);

  // Form / Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Select list
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Add Form State
  const [vehicleId, setVehicleId] = useState('');
  const [liters, setLiters] = useState('');
  const [costPerLiter, setCostPerLiter] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [mileageAtFill, setMileageAtFill] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load vehicles for select dropdown
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

  // Autofill totalCost when liters or costPerLiter changes
  useEffect(() => {
    const l = parseFloat(liters) || 0;
    const c = parseFloat(costPerLiter) || 0;
    if (l && c) {
      setTotalCost((l * c).toFixed(2));
    }
  }, [liters, costPerLiter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !liters || !costPerLiter || !date) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          liters: parseFloat(liters),
          costPerLiter: parseFloat(costPerLiter),
          totalCost: parseFloat(totalCost) || (parseFloat(liters) * parseFloat(costPerLiter)),
          mileageAtFill: parseFloat(mileageAtFill) || 0,
          fuelStation,
          date: new Date(date),
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to log fuel refill');
      }

      addToast('Fuel refilled logged and expense created', 'success');
      setIsAddModalOpen(false);
      refetch();
      // Reset form
      setVehicleId('');
      setLiters('');
      setCostPerLiter('');
      setTotalCost('');
      setMileageAtFill('');
      setFuelStation('');
      setDate('');
      setNotes('');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Summaries Calculations
  const totalLiters = logs?.reduce((sum, log) => sum + log.liters, 0) || 0;
  const totalSpent = logs?.reduce((sum, log) => sum + log.totalCost, 0) || 0;
  const avgCostPerLiter = logs && logs.length > 0 ? totalSpent / totalLiters : 0;

  // Chart data: Top 5 vehicles by fuel consumption
  const getChartData = () => {
    if (!logs) return [];
    const consumptionMap: Record<string, number> = {};
    logs.forEach((log) => {
      const reg = log.vehicle.registrationNumber;
      consumptionMap[reg] = (consumptionMap[reg] ?? 0) + log.liters;
    });

    return Object.entries(consumptionMap)
      .map(([reg, liters]) => ({ name: reg, liters: Math.round(liters) }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);
  };

  const chartData = getChartData();

  const isDriverOrManager = user?.role === 'FLEET_MANAGER' || user?.role === 'DRIVER';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Fuel Logs</h1>
          <p className="page-subtitle">Track refuels, compute efficiencies, and monitor consumption across the fleet.</p>
        </div>
        {isDriverOrManager && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} /> Log Fuel Purchase
            </button>
          </div>
        )}
      </div>

      {/* KPI stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Fuel Cost</span>
            <div className="stat-card-icon primary"><Fuel size={20} /></div>
          </div>
          <div className="stat-card-value">{formatCurrency(totalSpent)}</div>
          <div className="stat-card-change positive">Active log range summary</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Liters Purchased</span>
            <div className="stat-card-icon success"><Gauge size={20} /></div>
          </div>
          <div className="stat-card-value">{totalLiters.toLocaleString()} L</div>
          <div className="stat-card-change positive">Consumption tracking</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Average Price / Liter</span>
            <div className="stat-card-icon warning"><Activity size={20} /></div>
          </div>
          <div className="stat-card-value">${avgCostPerLiter.toFixed(2)}/L</div>
          <div className="stat-card-change positive">Fleet pricing baseline</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <select
          className="input-field"
          style={{ width: '220px' }}
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
        >
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.registrationNumber} - {v.make} {v.model}</option>
          ))}
        </select>
      </div>

      {/* Table & Chart Split */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'stretch' }}>
        {loading ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Liters</th>
                  <th>Cost/L</th>
                  <th>Total Cost</th>
                  <th>Station</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}><div className="skeleton skeleton-row" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : logs?.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-state-icon"><Fuel size={40} /></div>
            <h3 className="empty-state-title">No fuel logs logged</h3>
            <p className="empty-state-text">Refuel events will appear here once logged.</p>
          </div>
        ) : (
          <div className="table-container glass-card-static">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Liters</th>
                  <th>Cost/L</th>
                  <th>Total Cost</th>
                  <th>Station</th>
                  <th>Odometer</th>
                </tr>
              </thead>
              <tbody>
                {logs?.map((log) => (
                  <tr key={log.id}>
                    <td><span className="text-sm">{formatDate(log.date)}</span></td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-mono text-sm">{log.vehicle.registrationNumber}</span>
                        <span className="text-xs text-muted">{log.vehicle.make} {log.vehicle.model}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm">{log.driver?.user?.name || 'Automated System'}</span>
                    </td>
                    <td className="text-mono text-sm">{log.liters} L</td>
                    <td className="text-mono text-sm">${log.costPerLiter.toFixed(2)}</td>
                    <td className="text-mono font-semibold">{formatCurrency(log.totalCost)}</td>
                    <td>
                      <span className="text-sm flex items-center gap-1">
                        <MapPin size={12} className="text-muted" />
                        {log.fuelStation || 'Generic Station'}
                      </span>
                    </td>
                    <td className="text-mono text-sm">{log.mileageAtFill.toLocaleString()} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recharts Consumption Bar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Consumption by Vehicle</h3>
            <span className="text-muted text-sm">Top 5 (Liters)</span>
          </div>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ height: '200px' }}>
              <ChartIcon size={32} className="text-muted" />
              <p className="empty-state-text" style={{ fontSize: '0.8125rem' }}>No data to render chart</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="liters" fill="#6366f1" radius={[4, 4, 0, 0]} name="Liters" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Log Fuel Purchase</h3>
              <button className="btn-ghost" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">Vehicle</label>
                    <select
                      className="input-field"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      required
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>{v.registrationNumber} - {v.make} {v.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Liters Refilled</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="0.00"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Cost Per Liter ($)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="input-field"
                      placeholder="0.000"
                      value={costPerLiter}
                      onChange={(e) => setCostPerLiter(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Total Refuel Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="Calculated automatically"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Current Odometer (km)</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="e.g. 145000"
                      value={mileageAtFill}
                      onChange={(e) => setMileageAtFill(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Fuel Station Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Shell #23"
                      value={fuelStation}
                      onChange={(e) => setFuelStation(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Purchase Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">Notes</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Add any extra notes like receipt numbers or trailer attachments…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Logging Refuel...' : 'Log Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
