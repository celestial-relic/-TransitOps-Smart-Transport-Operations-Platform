'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  Bell, Check, X, Shield, Wrench, Fuel, DollarSign,
  AlertTriangle, AlertCircle, Info, Inbox
} from 'lucide-react';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: string;
  linkedEntity: string | null;
  linkedId: string | null;
  createdAt: string;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  LICENSE_EXPIRY: <AlertTriangle size={18} className="text-danger" />,
  MAINTENANCE_DUE: <Wrench size={18} className="text-warning" />,
  TRIP_COMPLETED: <Check size={18} className="text-success" />,
  HIGH_EXPENSE: <DollarSign size={18} className="text-danger" />,
  SAFETY_ALERT: <Shield size={18} className="text-warning" />,
  SYSTEM: <Info size={18} className="text-info" />,
};

const PRIORITY_BADGES: Record<string, string> = {
  NORMAL: 'badge-neutral',
  HIGH: 'badge-warning',
  CRITICAL: 'badge-danger',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const { data: notifications, loading, refetch } = useFetch<Notification[]>('/api/notifications');

  const filtered = notifications?.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    return true;
  }) || [];

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to mark read');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body triggers mark all as read
      });
      if (!res.ok) throw new Error('Failed to mark all read');
      addToast('All notifications marked as read', 'success');
      refetch();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated on compliance warnings, maintenance requests, and logistics operations.</p>
        </div>
        {notifications && notifications.some(n => !n.read) && (
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={handleMarkAllAsRead}>
              <Check size={16} /> Mark All as Read
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab${filter === 'ALL' ? ' active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All Notifications
        </button>
        <button
          className={`tab${filter === 'UNREAD' ? ' active' : ''}`}
          onClick={() => setFilter('UNREAD')}
        >
          Unread Only
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-state-icon"><Inbox size={40} /></div>
          <h3 className="empty-state-title">Inbox empty</h3>
          <p className="empty-state-text">You have no {filter === 'UNREAD' ? 'unread' : ''} notifications at this time.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`notification-item glass-card-static${!n.read ? ' unread' : ''}`}
              style={{
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                <div
                  style={{
                    padding: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {NOTIFICATION_ICONS[n.type] || <Bell size={18} className="text-muted" />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{n.title}</span>
                    <span className={`badge ${PRIORITY_BADGES[n.priority] || 'badge-neutral'}`}>
                      {n.priority}
                    </span>
                  </div>
                  <p className="text-sm text-secondary" style={{ maxWidth: '600px', lineHeight: 1.4 }}>{n.message}</p>
                  <span className="text-xs text-muted" style={{ marginTop: 2 }}>{formatDateTime(n.createdAt)}</span>
                </div>
              </div>

              {!n.read && (
                <button
                  className="btn btn-ghost btn-icon"
                  title="Mark as read"
                  onClick={() => handleMarkAsRead(n.id)}
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
