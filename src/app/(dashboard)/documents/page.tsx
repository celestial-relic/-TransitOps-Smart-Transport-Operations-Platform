'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useFetch } from '@/hooks/useFetch';
import { formatDateTime, classNames } from '@/lib/utils';
import {
  FileText, Plus, Search, Trash2, Download, UploadCloud, X, Calendar, User, Truck
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number | null;
  entityType: string;
  entityId: string;
  expiryDate: string | null;
  uploadedAt: string;
  vehicle?: { registrationNumber: string; make: string; model: string };
  driver?: { user: { name: string } };
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  
  const [filterEntityType, setFilterEntityType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const params = new URLSearchParams();
  if (filterEntityType === 'vehicle') params.set('vehicleId', 'true'); // simple query triggers
  
  const { data: documents, loading, refetch } = useFetch<Document[]>('/api/documents');

  // List loaders for select boxes
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    async function loadEntities() {
      try {
        const [vRes, dRes] = await Promise.all([
          fetch('/api/vehicles'),
          fetch('/api/drivers'),
        ]);
        if (vRes.ok) {
          const vData = await vRes.json();
          setVehicles(Array.isArray(vData) ? vData : vData.vehicles || []);
        }
        if (dRes.ok) {
          const dData = await dRes.json();
          setDrivers(Array.isArray(dData) ? dData : dData.drivers || []);
        }
      } catch (err) {
        // silent fallback
      }
    }
    loadEntities();
  }, []);

  // Form state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('REGISTRATION');
  const [entityType, setEntityType] = useState('vehicle');
  const [entityId, setEntityId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !docName || !entityId) {
      addToast('Please fill in all required fields and choose a file', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload file to filesystem
      const formData = new FormData();
      formData.append('file', uploadFile);

      const token = typeof window !== 'undefined' ? localStorage.getItem('transitops_token') : null;
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || 'File upload failed');
      }

      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      // 2. Create DB entry
      const dbRes = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: docName,
          type: docType,
          url: fileUrl,
          size: uploadFile.size,
          entityType,
          entityId,
          expiryDate: expiryDate || null,
        }),
      });

      if (!dbRes.ok) {
        const err = await dbRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save document record');
      }

      addToast('Document uploaded successfully', 'success');
      setIsUploadOpen(false);
      // Reset form
      setDocName('');
      setEntityType('vehicle');
      setEntityId('');
      setExpiryDate('');
      setUploadFile(null);
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('transitops_token') : null;
      const res = await fetch(`/api/documents/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete document');
      }

      addToast('Document deleted successfully', 'success');
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDocs = (documents || []).filter((doc) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      doc.name.toLowerCase().includes(query) ||
      doc.type.toLowerCase().includes(query) ||
      doc.vehicle?.registrationNumber.toLowerCase().includes(query) ||
      doc.driver?.user.name.toLowerCase().includes(query);
      
    if (filterEntityType) {
      return matchesSearch && doc.entityType === filterEntityType;
    }
    return matchesSearch;
  });

  return (
    <div>
      {/* Toast notifications */}
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
          <h1 className="page-title">Document Management</h1>
          <p className="page-subtitle">Upload, categorize, and download active driver and vehicle documents.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Plus size={16} /> Upload Document
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-input">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search documents by name, type, vehicle or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="input-field"
          style={{ width: 200 }}
          value={filterEntityType}
          onChange={(e) => setFilterEntityType(e.target.value)}
        >
          <option value="">All Entities</option>
          <option value="vehicle">Vehicles Only</option>
          <option value="driver">Drivers Only</option>
        </select>
      </div>

      {/* Main content table */}
      {loading ? (
        <div className="glass-card-static" style={{ padding: 0 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="glass-card-static">
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={32} /></div>
            <p className="empty-state-title">No documents found</p>
            <p className="empty-state-text">
              {searchQuery || filterEntityType ? 'Try adjusting your filters.' : 'Upload your first license, registration, or permit PDF/Image.'}
            </p>
            {!searchQuery && !filterEntityType && (
              <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
                <Plus size={16} /> Upload Document
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Type</th>
                <th>Linked Entity</th>
                <th>File Size</th>
                <th>Expiry Date</th>
                <th>Upload Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => {
                const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                return (
                  <tr key={doc.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span className="font-semibold truncate" style={{ maxWidth: 220 }} title={doc.name}>
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{doc.type}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm">
                        {doc.entityType === 'vehicle' ? (
                          <>
                            <Truck size={14} className="text-muted" />
                            <span>{doc.vehicle?.registrationNumber || 'Vehicle'}</span>
                          </>
                        ) : (
                          <>
                            <User size={14} className="text-muted" />
                            <span>{doc.driver?.user?.name || 'Driver'}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>{formatSize(doc.size)}</td>
                    <td>
                      {doc.expiryDate ? (
                        <span className={classNames('badge', isExpired ? 'badge-danger' : 'badge-success')}>
                          {new Date(doc.expiryDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{formatDateTime(doc.uploadedAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <a
                          href={doc.url}
                          download={doc.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-xs"
                          title="Download document file"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          className="btn btn-ghost btn-danger btn-xs"
                          onClick={() => setDeleteTarget(doc)}
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload document Modal */}
      {isUploadOpen && (
        <div className="modal-overlay" onClick={() => setIsUploadOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Upload Document File</h3>
              <button className="btn-close" onClick={() => setIsUploadOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="input-label">Document Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Registration Card, Driver License"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="input-label">Document Type</label>
                    <select className="input-field" value={docType} onChange={(e) => setDocType(e.target.value)}>
                      <option value="REGISTRATION">REGISTRATION</option>
                      <option value="INSURANCE">INSURANCE</option>
                      <option value="LICENSE">LICENSE</option>
                      <option value="PERMIT">PERMIT</option>
                      <option value="INVOICE">INVOICE</option>
                      <option value="CONTRACT">CONTRACT</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      className="input-field"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="input-label">Link Entity Type</label>
                    <select
                      className="input-field"
                      value={entityType}
                      onChange={(e) => {
                        setEntityType(e.target.value);
                        setEntityId('');
                      }}
                    >
                      <option value="vehicle">Vehicle (Bus / Truck)</option>
                      <option value="driver">Driver</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Link To Target *</label>
                    <select
                      className="input-field"
                      value={entityId}
                      onChange={(e) => setEntityId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Target --</option>
                      {entityType === 'vehicle'
                        ? vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.registrationNumber} - {v.make} {v.model}
                            </option>
                          ))
                        : drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.user?.name} ({d.employeeId})
                            </option>
                          ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">Document File *</label>
                  <div className="file-upload-zone" style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 8, padding: '24px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <input
                      type="file"
                      id="upload-file-input"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                          if (!docName) setDocName(e.target.files[0].name.split('.')[0]);
                        }
                      }}
                      required
                    />
                    <label htmlFor="upload-file-input" style={{ cursor: 'pointer' }}>
                      <UploadCloud size={32} style={{ color: 'var(--primary)', margin: '0 auto 8px', display: 'block' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                        {uploadFile ? uploadFile.name : 'Click to select or drag file here'}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Supports PDF, PNG, JPG, Docx (Max 10MB)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Delete Document</h3>
              <button className="btn-close" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete the document &quot;<strong>{deleteTarget.name}</strong>&quot;?</p>
              <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: 8 }}>
                This will delete the file from database storage and remove all connection paths. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
