'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DRIVER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      if (!name || !email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Registration failed');
        }

        addToast('Account created successfully! Logging in...', 'success');
        // Auto sign-in after sign up
        await login(email, password);
      } catch (err: any) {
        setError(err.message || 'Registration failed');
        setLoading(false);
      }
    } else {
      if (!email || !password) {
        setError('Please enter your email and password');
        setLoading(false);
        return;
      }
      try {
        await login(email, password);
      } catch (err: any) {
        setError(err.message || 'Login failed');
        setLoading(false);
      }
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, 'TransitOps2024!');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
      setLoading(false);
    }
  };

  const demoLogins = [
    { label: 'Fleet Manager', email: 'admin@transitops.com' },
    { label: 'Driver', email: 'driver@transitops.com' },
    { label: 'Safety Officer', email: 'safety@transitops.com' },
    { label: 'Financial Analyst', email: 'finance@transitops.com' },
  ];

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">TO</div>
          <span className="login-logo-text">TransitOps</span>
        </div>
        
        <h2 className="login-title">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        <p className="login-subtitle">
          {isSignUp ? 'Register to start transport operations' : 'Access the transport operations dashboard'}
        </p>

        {error && (
          <div className="badge badge-danger" style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, marginBottom: 20, textAlign: 'center', textTransform: 'none', letterSpacing: 'normal', fontSize: '0.8125rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Marcus Chen"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {isSignUp && (
            <div className="input-group">
              <label className="input-label" htmlFor="role">Role Type</label>
              <select
                id="role"
                className="input-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="FLEET_MANAGER">Fleet Manager</option>
                <option value="DRIVER">Driver</option>
                <option value="SAFETY_OFFICER">Safety Officer</option>
                <option value="FINANCIAL_ANALYST">Financial Analyst</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
            {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading ? (isSignUp ? 'Registering...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '0.8125rem', color: 'var(--primary-hover)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              setIsSignUp(prev => !prev);
              setError(null);
            }}
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {!isSignUp && (
          <>
            <div className="login-divider">Or quick sign in as</div>
            <div className="demo-logins">
              {demoLogins.map((role) => (
                <button
                  key={role.label}
                  type="button"
                  className="demo-login-btn"
                  onClick={() => handleDemoLogin(role.email)}
                  disabled={loading}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
