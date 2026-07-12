'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';
import { User, Shield, Phone, MapPin, Calendar, Award, Loader2 } from 'lucide-react';

interface DriverProfile {
  id: string;
  employeeId: string;
  licenseNumber: string;
  licenseExpiry: string;
  licenseType: string;
  experience: number;
  safetyScore: number;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/drivers');
        if (!res.ok) throw new Error('Failed to load profiles');
        const data = await res.json();
        
        // Find driver that belongs to the current user
        const ownProfile = (data.drivers || data).find((d: any) => d.userId === user?.id);
        if (ownProfile) {
          setProfile(ownProfile);
        }
      } catch (err: any) {
        addToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    if (user) loadProfile();
  }, [user, addToast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ height: '300px' }}>
        <Loader2 size={36} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage emergency contacts, license registrations, and view performance scores.</p>
        </div>
      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Profile Card */}
        <div className="glass-card-static" style={{ padding: '24px' }}>
          <div className="flex items-center gap-4" style={{ marginBottom: '24px' }}>
            <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem', borderRadius: '50%' }}>
              {user?.name ? user.name[0].toUpperCase() : 'D'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user?.name}</h2>
              <span className="text-sm text-muted">{user?.email}</span>
              <div style={{ marginTop: '4px' }}>
                <span className="badge badge-primary">Emp ID: {profile?.employeeId || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-primary" />
              <div>
                <span className="text-xs text-muted" style={{ display: 'block' }}>Phone</span>
                <span className="text-sm">{profile?.phone || 'Not provided'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-primary" />
              <div>
                <span className="text-xs text-muted" style={{ display: 'block' }}>Address</span>
                <span className="text-sm">{profile?.address || 'Not provided'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-primary" />
              <div>
                <span className="text-xs text-muted" style={{ display: 'block' }}>Date of Birth</span>
                <span className="text-sm">{profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Not provided'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* License & Safety */}
        <div className="flex flex-col gap-4">
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <h3 className="flex items-center gap-2" style={{ fontSize: '1.125rem', marginBottom: '16px' }}>
              <Award size={18} className="text-primary" /> License Credentials
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between" style={{ padding: '10px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-sm text-secondary">License Number</span>
                <span className="text-sm font-semibold text-mono">{profile?.licenseNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '10px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-sm text-secondary">License Type</span>
                <span className="text-sm font-semibold text-mono">{profile?.licenseType || 'N/A'}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '10px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-sm text-secondary">License Expiry</span>
                <span className="text-sm font-semibold text-mono">{profile?.licenseExpiry ? formatDate(profile.licenseExpiry) : 'N/A'}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '10px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-sm text-secondary">Experience (Years)</span>
                <span className="text-sm font-semibold text-mono">{profile?.experience} years</span>
              </div>
              <div className="flex justify-between" style={{ padding: '10px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-sm text-secondary">Safety Rating Score</span>
                <span className={`badge ${profile && profile.safetyScore >= 90 ? 'badge-success' : profile && profile.safetyScore >= 75 ? 'badge-warning' : 'badge-danger'}`}>
                  {profile?.safetyScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* Emergency contacts */}
          <div className="glass-card-static" style={{ padding: '24px' }}>
            <h3 className="flex items-center gap-2" style={{ fontSize: '1.125rem', marginBottom: '16px' }}>
              <Shield size={18} className="text-primary" /> Emergency Contact
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-secondary">Contact Name</span>
                <span className="text-sm font-semibold">{profile?.emergencyContact || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-secondary">Contact Phone</span>
                <span className="text-sm font-semibold">{profile?.emergencyPhone || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
