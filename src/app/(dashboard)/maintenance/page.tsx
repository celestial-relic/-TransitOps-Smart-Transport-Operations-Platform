'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Wrench, Plus, Play, Check, X, Search, Calendar,
  AlertCircle, Shield, User, DollarSign
} from 'lucide-react';

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface Maintenance {
  id: string;
  vehicleId: string;
  type: string;
  issue: string;
  description: string | null;
  mechanic: string | null;
  cost: number;
  priority: string;
  status: string;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  vehicle: {
    registrationNumber: string;
    make: string;
    model: string;
  };
}

const PRIORITY_BADGES: Record<string, string> = {
  LOW: 'badge-neutral',
  MEDIUM: 'badge-info',
  HIGH: 'badge-warning',
  CRITICAL: 'badge-danger',
};

const STATUS_BADGES: Record<string, string> = {
  SCHEDULED: 'badge-neutral',
  IN_PROGRESS: 'badge-warning',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [url, setUrl] = useState('/api/maintenance');

  const { data: records, loading, refetch } = useFetch<Maintenance[]>(url);

  // Update url when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (vehicleFilter) params.append('vehicleId', vehicleFilter);
    setUrl(`/api/maintenance?${params.toString()}`);
  }, [statusFilter, vehicleFilter]);

  // Form / Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Selector list
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Add Form State
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('PREVENTIVE');
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [cost, setCost] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [scheduledDate, setScheduledDate] = useState('');

  // Complete Form State
  const [actualCost, setActualCost] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Fetch vehicles for scheduling select
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
    if (!vehicleId || !issue || !scheduledDate) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          type,
          issue,
          description,
          mechanic,
          cost: parseFloat(cost) || 0,
          priority,
          scheduledDate: new Date(scheduledDate),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to schedule maintenance');
      }

      addToast('Maintenance task scheduled successfully', 'success');
      setIsAddModalOpen(false);
      refetch();
      // Reset form
      setVehicleId('');
      setType('PREVENTIVE');
      setIssue('');
      setDescription('');
      setMechanic('');
      setCost('');
      setPriority('MEDIUM');
      setScheduledDate('');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start maintenance');
      }
      addToast('Maintenance task started, vehicle status set to MAINTENANCE', 'success');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/maintenance/${selectedRecordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          cost: parseFloat(actualCost) || 0,
          notes: completionNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete maintenance');
      }

      addToast('Maintenance completed. Vehicle status updated to ACTIVE, expense logged.', 'success');
      setIsCompleteModalOpen(false);
      setSelectedRecordId(null);
      setActualCost('');
      setCompletionNotes('');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this maintenance task?')) return;
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel maintenance');
      }
      addToast('Maintenance task cancelled', 'info');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this maintenance record?')) return;
    try {
      const res = await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      addToast('Maintenance task deleted successfully', 'success');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const isSafetyOrManager = user?.role === 'FLEET_MANAGER' || user?.role === 'SAFETY_OFFICER';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Manage service records, resolve vehicle issues, and prevent operational failures.</p>
        </div>
        {isSafetyOrManager && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} /> Schedule Maintenance
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
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

        <select
          className="input-field"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Scheduled Date</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td colSpan={8}><div className="skeleton skeleton-row" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : records?.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-state-icon"><Wrench size={40} /></div>
          <h3 className="empty-state-title">No maintenance tasks scheduled</h3>
          <p className="empty-state-text">There are no records matching the filters.</p>
        </div>
      ) : (
        <div className="table-container glass-card-static">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Scheduled Date</th>
                <th>Mechanic</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records?.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-mono text-sm">{record.vehicle.registrationNumber}</span>
                      <span className="text-xs text-muted">{record.vehicle.make} {record.vehicle.model}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm font-medium">{record.type}</span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{record.issue}</span>
                      <span className="text-xs text-muted">{record.description || 'No description'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${PRIORITY_BADGES[record.priority] || 'badge-neutral'}`}>
                      {record.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGES[record.status] || 'badge-neutral'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm">{formatDate(record.scheduledDate)}</span>
                  </td>
                  <td>
                    <span className="text-sm">{record.mechanic || 'Unassigned'}</span>
                  </td>
                  <td className="text-mono font-semibold">
                    {formatCurrency(record.cost)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {isSafetyOrManager && record.status === 'SCHEDULED' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleStart(record.id)}
                        >
                          <Play size={12} style={{ color: 'var(--warning)' }} /> Start
                        </button>
                      )}
                      {isSafetyOrManager && (record.status === 'IN_PROGRESS' || record.status === 'SCHEDULED') && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setSelectedRecordId(record.id);
                            setActualCost(record.cost.toString());
                            setIsCompleteModalOpen(true);
                          }}
                        >
                          <Check size={12} style={{ color: 'var(--success)' }} /> Complete
                        </button>
                      )}
                      {isSafetyOrManager && (record.status === 'SCHEDULED' || record.status === 'IN_PROGRESS') && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleCancel(record.id)}
                        >
                          <X size={12} style={{ color: 'var(--danger)' }} /> Cancel
                        </button>
                      )}
                      {user?.role === 'FLEET_MANAGER' && record.status !== 'IN_PROGRESS' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Schedule Maintenance</h3>
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
                    <label className="input-label">Type</label>
                    <select
                      className="input-field"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="PREVENTIVE">Preventive</option>
                      <option value="CORRECTIVE">Corrective</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Issue Summary</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Engine noise, Brake pad wear"
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Priority</label>
                    <select
                      className="input-field"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Scheduled Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Estimated Cost ($)</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="0.00"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Mechanic / Service Shop</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Fleet Solutions Ltd"
                      value={mechanic}
                      onChange={(e) => setMechanic(e.target.value)}
                    />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">Detailed Description</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Describe the diagnostics, instructions, or symptoms…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {isCompleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Complete Maintenance</h3>
              <button className="btn-ghost" onClick={() => setIsCompleteModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCompleteSubmit}>
              <div className="modal-body">
                <div className="flex flex-col gap-4">
                  <div className="input-group">
                    <label className="input-label">Actual Maintenance Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="0.00"
                      value={actualCost}
                      onChange={(e) => setActualCost(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Completion Notes / Work Done</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Describe work completed, parts replaced, or findings…"
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Complete Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
