'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export default function Topbar({ sidebarCollapsed }: TopbarProps) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notification count
  useEffect(() => {
    let cancelled = false;

    async function fetchUnread() {
      try {
        const res = await fetch('/api/notifications?unread=true');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setUnreadCount(
            typeof data.count === 'number'
              ? data.count
              : Array.isArray(data)
                ? data.length
                : 0,
          );
        }
      } catch {
        /* silent */
      }
    }

    fetchUnread();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen, handleOutsideClick]);

  return (
    <header
      className="topbar"
      style={{
        left: sidebarCollapsed ? 72 : 260,
        transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Search */}
      <div className="topbar-search">
        <Search size={18} />
        <input type="text" placeholder="Search routes, vehicles, drivers…" />
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        {/* Notification bell */}
        <button className="topbar-icon-btn" type="button" title="Notifications">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="dropdown" ref={dropdownRef}>
          <button
            className="user-avatar"
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <span>{user ? getInitials(user.name) : '??'}</span>
            <ChevronDown size={14} />
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item" style={{ cursor: 'default' }}>
                <User size={16} />
                <div>
                  <div style={{ fontWeight: 600 }}>{user?.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    {user?.role?.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
