'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useFetch } from '@/hooks/useFetch';
import { VehicleStatus, VehicleType, FuelType, hasPermission } from '@/lib/constants';
import { formatCurrency, formatDate, formatDistance, classNames } from '@/lib/utils';
import {
  Truck, Plus, Search, Edit2, Trash2, X, ChevronLeft,
  ChevronRight, Filter, MoreVertical
} from 'lucide-react';

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  type: string;
  color: string | null;
  vin: string | null;
  maxLoad: number;
  currentOdometer: number;
  fuelType: string;
  acquisitionCost: number;
  insuranceExpiry: string | null;
  status: string;
  notes: string | null;
}

interface VehiclesResponse {
  vehicles: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const emptyForm = {
  registrationNumber: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  type: 'TRUCK',
  color: '',
  vin: '',
  maxLoad: 0,
  fuelType: 'DIESEL',
  acquisitionCost: 0,
  insuranceExpiry: '',
  status: 'ACTIVE',
  notes: '',
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'badge badge-success',
    MAINTENANCE: 'badge badge-warning',
    RETIRED: 'badge badge-danger',
  };
  return map[status] || 'badge badge-neutral';
};

export default function VehiclesPage() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);
  if (typeFilter) params.set('type', typeFilter);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  const { data, loading, refetch } = useFetch<VehiclesResponse>(`/api/vehicles?${params.toString()}`);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = user?.role ? hasPermission(user.role as 'FLEET_MANAGER', 'vehicle', 'create') : false;
  const canUpdate = user?.role ? hasPermission(user.role as 'FLEET_MANAGER', 'vehicle', 'update') : false;
  const canDelete = user?.role ? hasPermission(user.role as 'FLEET_MANAGER', 'vehicle', 'delete') : false;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      registrationNumber: v.registrationNumber,
      make: v.make,
      model: v.model,
      year: v.year,
      type: v.type,
      color: v.color || '',
      vin: v.vin || '',
      maxLoad: v.maxLoad,
      fuelType: v.fuelType,
      acquisitionCost: v.acquisitionCost,
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : '',
      status: v.status,
      notes: v.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        year: Number(form.year),
        maxLoad: Number(form.maxLoad),
        acquisitionCost: Number(form.acquisitionCost),
        insuranceExpiry: form.insuranceExpiry || null,
      };

      const url = editing ? `/api/vehicles/${editing.id}` : '/api/vehicles';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save vehicle');
      }

      addToast(editing ? 'Vehicle updated successfully' : 'Vehicle created successfully', 'success');
      setShowModal(false);
      refetch();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Error saving vehicle', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, editing, addToast, refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete vehicle');
      }
      addToast('Vehicle deleted successfully', 'success');
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Error deleting vehicle', 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, addToast, refetch]);

  const updateField = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const vehicles = data?.vehicles || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  return (
    <div>
      {/* Toast */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <span className="toast-message">{t.message}</span>
              <button className="toast-close" onClick={() => removeToast(t.id)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Vehicles</h1>
          <p className="page-subtitle">Manage your fleet of {total} vehicles</p>
        </div>
        {canCreate && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input-field"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {Object.values(VehicleStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ width: 140 }}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          {Object.values(VehicleType).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card-static" style={{ padding: 0 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="glass-card-static">
          <div className="empty-state">
            <div className="empty-state-icon"><Truck size={32} /></div>
            <p className="empty-state-title">No vehicles found</p>
            <p className="empty-state-text">
              {search || statusFilter || typeFilter
                ? 'Try adjusting your filters.'
                : 'Add your first vehicle to get started.'}
            </p>
            {canCreate && !search && !statusFilter && !typeFilter && (
              <button className="btn btn-primary" onClick={openAdd}>
                <Plus size={16} /> Add Vehicle
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Make / Model</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Odometer</th>
                  <th>Max Load</th>
                  <th>Fuel Type</th>
                  {(canUpdate || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td><span className="font-semibold">{v.registrationNumber}</span></td>
                    <td>{v.make} {v.model} ({v.year})</td>
                    <td><span className="badge badge-neutral">{v.type}</span></td>
                    <td><span className={statusBadge(v.status)}>{v.status}</span></td>
                    <td>{formatDistance(v.currentOdometer)}</td>
                    <td>{v.maxLoad.toLocaleString()} kg</td>
                    <td>{v.fuelType}</td>
                    {(canUpdate || canDelete) && (
                      <td>
                        <div className="flex gap-1">
                          {canUpdate && (
                            <button className="btn btn-ghost btn-icon" onClick={() => openEdit(v)} title="Edit">
                              <Edit2 size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(v)} title="Delete" style={{ color: 'var(--danger)' }}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span className="pagination-info">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="pagination-buttons">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={classNames('pagination-btn', page === pageNum && 'active')}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">Registration Number</label>
                  <input
                    className="input-field"
                    value={form.registrationNumber}
                    onChange={(e) => updateField('registrationNumber', e.target.value)}
                    placeholder="e.g. ABC-1234"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Make</label>
                  <input
                    className="input-field"
                    value={form.make}
                    onChange={(e) => updateField('make', e.target.value)}
                    placeholder="e.g. Volvo"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Model</label>
                  <input
                    className="input-field"
                    value={form.model}
                    onChange={(e) => updateField('model', e.target.value)}
                    placeholder="e.g. FH16"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Year</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.year}
                    onChange={(e) => updateField('year', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Type</label>
                  <select
                    className="input-field"
                    value={form.type}
                    onChange={(e) => updateField('type', e.target.value)}
                  >
                    {Object.values(VehicleType).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Fuel Type</label>
                  <select
                    className="input-field"
                    value={form.fuelType}
                    onChange={(e) => updateField('fuelType', e.target.value)}
                  >
                    {Object.values(FuelType).map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Max Load (kg)</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.maxLoad}
                    onChange={(e) => updateField('maxLoad', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Color</label>
                  <input
                    className="input-field"
                    value={form.color}
                    onChange={(e) => updateField('color', e.target.value)}
                    placeholder="e.g. White"
                  />
                </div>
                <div className="input-group full-width">
                  <label className="input-label">VIN</label>
                  <input
                    className="input-field"
                    value={form.vin}
                    onChange={(e) => updateField('vin', e.target.value)}
                    placeholder="Vehicle Identification Number"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    {Object.values(VehicleStatus).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Insurance Expiry</label>
                  <input
                    className="input-field"
                    type="date"
                    value={form.insuranceExpiry}
                    onChange={(e) => updateField('insuranceExpiry', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Acquisition Cost</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.acquisitionCost}
                    onChange={(e) => updateField('acquisitionCost', e.target.value)}
                  />
                </div>
                <div className="input-group full-width">
                  <label className="input-label">Notes</label>
                  <textarea
                    className="input-field"
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-dialog-icon danger">
                <Trash2 size={28} />
              </div>
              <h3 className="confirm-dialog-title">Delete Vehicle</h3>
              <p className="confirm-dialog-message">
                Are you sure you want to delete <strong>{deleteTarget.registrationNumber}</strong>?
                This action cannot be undone.
              </p>
              <div className="confirm-dialog-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
