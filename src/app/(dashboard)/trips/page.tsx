'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, formatCurrency, formatDistance, classNames } from '@/lib/utils';
import {
  MapPin, Plus, Play, Check, X, Search, Clock, Shield,
  Truck, User as UserIcon, Calendar, ArrowRight, Gauge, Fuel
} from 'lucide-react';

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  maxLoad: number;
}

interface Driver {
  id: string;
  employeeId: string;
  user: {
    name: string;
  };
}

interface Trip {
  id: string;
  tripNumber: string;
  source: string;
  destination: string;
  cargoDescription: string | null;
  cargoWeight: number;
  plannedDistance: number;
  actualDistance: number | null;
  estimatedFuel: number;
  actualFuel: number | null;
  status: string;
  priority: string;
  scheduledDate: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
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
  };
}

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'badge-neutral',
  DISPATCHED: 'badge-info',
  IN_TRANSIT: 'badge-primary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export default function TripsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [url, setUrl] = useState('/api/trips');

  const { data: trips, loading, refetch } = useFetch<Trip[]>(url);

  // Update url when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (search) params.append('search', search);
    setUrl(`/api/trips?${params.toString()}`);
  }, [search, statusFilter]);

  // Form / Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Lists for creation select
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Add Form State
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');
  const [estimatedFuel, setEstimatedFuel] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [notes, setNotes] = useState('');

  // Complete Form State
  const [actualDistance, setActualDistance] = useState('');
  const [actualFuel, setActualFuel] = useState('');

  // Cancel Form State
  const [cancelReason, setCancelReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load vehicles and drivers for selectors
  const loadSelectors = async () => {
    try {
      const [vehRes, drvRes] = await Promise.all([
        fetch('/api/vehicles?status=ACTIVE'),
        fetch('/api/drivers?status=AVAILABLE'),
      ]);
      if (vehRes.ok) {
        const vData = await vehRes.json();
        setVehicles(Array.isArray(vData) ? vData : vData.vehicles || []);
      }
      if (drvRes.ok) {
        const dData = await drvRes.json();
        setDrivers(Array.isArray(dData) ? dData : dData.drivers || []);
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (isAddModalOpen) {
      loadSelectors();
    }
  }, [isAddModalOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverId || !source || !destination) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          driverId,
          source,
          destination,
          cargoDescription,
          cargoWeight: parseFloat(cargoWeight) || 0,
          plannedDistance: parseFloat(plannedDistance) || 0,
          estimatedFuel: parseFloat(estimatedFuel) || 0,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          priority,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create trip');
      }

      addToast('Trip created successfully as DRAFT', 'success');
      setIsAddModalOpen(false);
      refetch();
      // Reset form
      setVehicleId('');
      setDriverId('');
      setSource('');
      setDestination('');
      setCargoDescription('');
      setCargoWeight('');
      setPlannedDistance('');
      setEstimatedFuel('');
      setScheduledDate('');
      setPriority('MEDIUM');
      setNotes('');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (tripId: string) => {
    if (!confirm('Are you sure you want to dispatch this trip?')) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/dispatch`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Dispatch failed');
      }
      addToast('Trip successfully dispatched!', 'success');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${selectedTripId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDistance: parseFloat(actualDistance),
          actualFuel: parseFloat(actualFuel),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Completion failed');
      }

      addToast('Trip marked as completed. Fuel log & expenses updated.', 'success');
      setIsCompleteModalOpen(false);
      setSelectedTripId(null);
      setActualDistance('');
      setActualFuel('');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${selectedTripId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Cancellation failed');
      }

      addToast('Trip successfully cancelled.', 'success');
      setIsCancelModalOpen(false);
      setSelectedTripId(null);
      setCancelReason('');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip record?')) return;
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      addToast('Trip deleted successfully.', 'success');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const isFleetManager = user?.role === 'FLEET_MANAGER';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Trips</h1>
          <p className="page-subtitle">Coordinate shipments, validate dispatch parameters, and review actual logs.</p>
        </div>
        {isFleetManager && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} /> Add Trip
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search trip#, routes, cargo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="IN_TRANSIT">In Transit</option>
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
                <th>Trip #</th>
                <th>Source → Destination</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td colSpan={7}><div className="skeleton skeleton-row" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : trips?.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-state-icon"><MapPin size={40} /></div>
          <h3 className="empty-state-title">No trips found</h3>
          <p className="empty-state-text">There are no trips matching the selected criteria.</p>
        </div>
      ) : (
        <div className="table-container glass-card-static">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trip #</th>
                <th>Source → Destination</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Cargo / Load</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips?.map((trip) => (
                <tr key={trip.id}>
                  <td className="text-mono font-semibold">{trip.tripNumber}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{trip.source}</span>
                      <ArrowRight size={12} className="text-muted" />
                      <span className="font-medium">{trip.destination}</span>
                    </div>
                    <span className="text-xs text-muted" style={{ display: 'block', marginTop: 2 }}>
                      Distance: {trip.plannedDistance} km
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-muted" />
                      <span>{trip.driver?.user?.name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-muted" />
                      <span className="text-mono text-sm">{trip.vehicle?.registrationNumber}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm" style={{ display: 'block' }}>{trip.cargoDescription || 'No cargo description'}</span>
                    <span className="text-xs text-muted">{trip.cargoWeight} kg</span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGES[trip.status] || 'badge-neutral'}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm">
                      {trip.scheduledDate ? formatDate(trip.scheduledDate) : 'Not scheduled'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {isFleetManager && trip.status === 'DRAFT' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Dispatch Trip"
                          onClick={() => handleDispatch(trip.id)}
                        >
                          <Play size={14} style={{ color: 'var(--primary)' }} /> Dispatch
                        </button>
                      )}
                      {(isFleetManager || user?.role === 'DRIVER') && (trip.status === 'DISPATCHED' || trip.status === 'IN_TRANSIT') && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Complete Trip"
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            setActualDistance(trip.plannedDistance.toString());
                            setActualFuel(trip.estimatedFuel.toString());
                            setIsCompleteModalOpen(true);
                          }}
                        >
                          <Check size={14} style={{ color: 'var(--success)' }} /> Complete
                        </button>
                      )}
                      {(isFleetManager || user?.role === 'DRIVER') && (trip.status === 'DRAFT' || trip.status === 'DISPATCHED' || trip.status === 'IN_TRANSIT') && (
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Cancel Trip"
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            setIsCancelModalOpen(true);
                          }}
                        >
                          <X size={14} style={{ color: 'var(--danger)' }} /> Cancel
                        </button>
                      )}
                      {isFleetManager && (trip.status === 'DRAFT' || trip.status === 'CANCELLED') && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(trip.id)}
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
              <h3>Create New Trip</h3>
              <button className="btn-ghost" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">Vehicle (Active)</label>
                    <select
                      className="input-field"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      required
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} - {v.make} {v.model} (Max Load: {v.maxLoad} kg)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Driver (Available)</label>
                    <select
                      className="input-field"
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      required
                    >
                      <option value="">Select driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.name} ({d.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Source Route</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. New York"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Destination Route</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Chicago"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Cargo Description</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Industrial Steel"
                      value={cargoDescription}
                      onChange={(e) => setCargoDescription(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Cargo Weight (kg)</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="e.g. 5000"
                      value={cargoWeight}
                      onChange={(e) => setCargoWeight(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Planned Distance (km)</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="e.g. 1200"
                      value={plannedDistance}
                      onChange={(e) => setPlannedDistance(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Estimated Fuel (Liters)</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="e.g. 400"
                      value={estimatedFuel}
                      onChange={(e) => setEstimatedFuel(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Scheduled Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
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
                  <div className="input-group full-width">
                    <label className="input-label">Notes</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Draft'}
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
              <h3>Log Trip Completion metrics</h3>
              <button className="btn-ghost" onClick={() => setIsCompleteModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleComplete}>
              <div className="modal-body">
                <div className="flex flex-col gap-4">
                  <div className="input-group">
                    <label className="input-label">Actual Distance Traveled (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-field"
                      value={actualDistance}
                      onChange={(e) => setActualDistance(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Actual Fuel Consumed (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-field"
                      value={actualFuel}
                      onChange={(e) => setActualFuel(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Completing...' : 'Complete Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Cancel Trip</h3>
              <button className="btn-ghost" onClick={() => setIsCancelModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCancel}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Cancellation Reason</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Enter reason for cancellation…"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCancelModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? 'Cancelling...' : 'Cancel Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
