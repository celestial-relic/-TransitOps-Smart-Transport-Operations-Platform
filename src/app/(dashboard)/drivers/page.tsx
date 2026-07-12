'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useFetch } from '@/hooks/useFetch';
import { DriverStatus, hasPermission } from '@/lib/constants';
import { formatDate, classNames, isExpiringSoon } from '@/lib/utils';
import {
  Users, Plus, Search, Edit2, Trash2, X, ChevronLeft,
  ChevronRight, AlertTriangle, Shield, ShieldAlert, ShieldCheck
} from 'lucide-react';

interface Driver {
  id: string;
  employeeId: string;
  phone: string | null;
  address: string | null;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  experience: number;
  safetyScore: number;
  status: string;
  notes: string | null;
  user: { id: string; name: string; email: string };
}

interface DriversResponse {
  drivers: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  licenseNumber: '',
  licenseType: 'CDL-A',
  licenseExpiry: '',
  experience: 0,
  status: 'AVAILABLE',
  notes: '',
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    AVAILABLE: 'badge badge-success',
    ON_TRIP: 'badge badge-info',
    SUSPENDED: 'badge badge-danger',
    OFF_DUTY: 'badge badge-neutral',
  };
  return map[status] || 'badge badge-neutral';
};

const safetyColor = (score: number): string => {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
};

const SafetyIcon = ({ score }: { score: number }) => {
  if (score >= 80) return <ShieldCheck size={16} style={{ color: 'var(--success)' }} />;
  if (score >= 60) return <Shield size={16} style={{ color: 'var(--warning)' }} />;
  return <ShieldAlert size={16} style={{ color: 'var(--danger)' }} />;
};

export default function DriversPage() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  const { data, loading, refetch } = useFetch<DriversResponse>(`/api/drivers?${params.toString()}`);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = user?.role ? hasPermission(user.role as 'FLEET_MANAGER', 'driver', 'create') : false;
  const canUpdate = user?.role ? hasPermission(user.role as 'FLEET_MANAGER', 'driver', 'update') : false;
  const canDelete = user?.role ? hasPermission(user.role as 'FLEET_MANAGER', 'driver', 'delete') : false;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({
      name: d.user.name,
      email: d.user.email,
      phone: d.phone || '',
      address: d.address || '',
      licenseNumber: d.licenseNumber,
      licenseType: d.licenseType,
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
      experience: d.experience,
      status: d.status,
      notes: d.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        experience: Number(form.experience),
      };

      const url = editing ? `/api/drivers/${editing.id}` : '/api/drivers';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save driver');
      }

      addToast(editing ? 'Driver updated successfully' : 'Driver created successfully', 'success');
      setShowModal(false);
      refetch();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Error saving driver', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, editing, addToast, refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drivers/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete driver');
      }
      addToast('Driver deleted successfully', 'success');
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Error deleting driver', 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, addToast, refetch]);

  const updateField = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const drivers = data?.drivers || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  return (
    <div>
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

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">Manage {total} registered drivers</p>
        </div>
        {canCreate && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Driver
            </button>
          </div>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search drivers..."
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
          {Object.values(DriverStatus).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="glass-card-static" style={{ padding: 0 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="glass-card-static">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={32} /></div>
            <p className="empty-state-title">No drivers found</p>
            <p className="empty-state-text">
              {search || statusFilter ? 'Try adjusting your filters.' : 'Add your first driver to get started.'}
            </p>
            {canCreate && !search && !statusFilter && (
              <button className="btn btn-primary" onClick={openAdd}>
                <Plus size={16} /> Add Driver
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
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>License #</th>
                  <th>License Expiry</th>
                  <th>Safety Score</th>
                  <th>Status</th>
                  {(canUpdate || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => {
                  const expiring = isExpiringSoon(new Date(d.licenseExpiry), 30);
                  const expired = new Date(d.licenseExpiry) < new Date();
                  return (
                    <tr key={d.id}>
                      <td><span className="font-semibold text-mono">{d.employeeId}</span></td>
                      <td>
                        <div>
                          <div className="font-semibold">{d.user.name}</div>
                          <div className="text-xs text-muted">{d.user.email}</div>
                        </div>
                      </td>
                      <td>{d.licenseNumber}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={classNames(expired && 'text-xs', expiring && !expired && 'text-xs')}>
                            {formatDate(d.licenseExpiry)}
                          </span>
                          {expired && (
                            <span className="badge badge-danger">Expired</span>
                          )}
                          {expiring && !expired && (
                            <span className="badge badge-warning">
                              <AlertTriangle size={10} /> Expiring
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <SafetyIcon score={d.safetyScore} />
                          <div style={{ flex: 1, maxWidth: 80 }}>
                            <div style={{
                              height: 6,
                              borderRadius: 3,
                              background: 'rgba(255,255,255,0.08)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${d.safetyScore}%`,
                                height: '100%',
                                background: safetyColor(d.safetyScore),
                                borderRadius: 3,
                                transition: 'width 0.3s',
                              }} />
                            </div>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: safetyColor(d.safetyScore), minWidth: 28 }}>
                            {d.safetyScore}
                          </span>
                        </div>
                      </td>
                      <td><span className={statusBadge(d.status)}>{d.status.replace('_', ' ')}</span></td>
                      {(canUpdate || canDelete) && (
                        <td>
                          <div className="flex gap-1">
                            {canUpdate && (
                              <button className="btn btn-ghost btn-icon" onClick={() => openEdit(d)} title="Edit">
                                <Edit2 size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(d)} title="Delete" style={{ color: 'var(--danger)' }}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="pagination-info">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
              <h3>{editing ? 'Edit Driver' : 'Add Driver'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input className="input-field" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="John Doe" />
                </div>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input className="input-field" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="john@example.com" disabled={!!editing} />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone</label>
                  <input className="input-field" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+1 555 0100" />
                </div>
                <div className="input-group">
                  <label className="input-label">License Number</label>
                  <input className="input-field" value={form.licenseNumber} onChange={(e) => updateField('licenseNumber', e.target.value)} placeholder="DL-123456" />
                </div>
                <div className="input-group">
                  <label className="input-label">License Type</label>
                  <select className="input-field" value={form.licenseType} onChange={(e) => updateField('licenseType', e.target.value)}>
                    <option value="CDL-A">CDL-A</option>
                    <option value="CDL-B">CDL-B</option>
                    <option value="CDL-C">CDL-C</option>
                    <option value="Non-CDL">Non-CDL</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">License Expiry</label>
                  <input className="input-field" type="date" value={form.licenseExpiry} onChange={(e) => updateField('licenseExpiry', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Experience (years)</label>
                  <input className="input-field" type="number" value={form.experience} onChange={(e) => updateField('experience', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select className="input-field" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                    {Object.values(DriverStatus).map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group full-width">
                  <label className="input-label">Address</label>
                  <input className="input-field" value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="123 Main St" />
                </div>
                <div className="input-group full-width">
                  <label className="input-label">Notes</label>
                  <textarea className="input-field" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Driver' : 'Add Driver'}
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
              <h3 className="confirm-dialog-title">Delete Driver</h3>
              <p className="confirm-dialog-message">
                Are you sure you want to delete <strong>{deleteTarget.user.name}</strong>?
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
