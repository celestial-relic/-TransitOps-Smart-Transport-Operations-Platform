'use client';

import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import {
  Brain, AlertTriangle, AlertCircle, Lightbulb,
  CheckCircle, Loader2, Sparkles, TrendingUp
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'critical' | 'warning' | 'suggestion' | 'positive';
  title: string;
  description: string;
  metric?: string;
  recommendation: string;
  category: string;
}

const SEVERITY_BADGES = {
  critical: 'badge-danger',
  warning: 'badge-warning',
  suggestion: 'badge-info',
  positive: 'badge-success',
};

const SEVERITY_ICONS = {
  critical: <AlertTriangle size={20} className="text-danger" />,
  warning: <AlertCircle size={20} className="text-warning" />,
  suggestion: <Lightbulb size={20} className="text-info" />,
  positive: <CheckCircle size={20} className="text-success" />,
};

export default function AIInsightsPage() {
  const { user } = useAuth();
  const { data: insights, loading } = useFetch<Insight[]>('/api/ai-insights');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <h1 className="page-title">AI Insights Engine</h1>
            <Sparkles size={18} className="text-primary animate-pulse" />
          </div>
          <p className="page-subtitle">Rule-based optimization algorithms identifying anomalies, compliance concerns, and operational waste.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '300px' }}>
          <Loader2 size={36} className="animate-spin text-muted" />
        </div>
      ) : !insights || insights.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-state-icon"><Brain size={40} /></div>
          <h3 className="empty-state-title">No insights generated</h3>
          <p className="empty-state-text">The insight engine is currently analyzing fleet metrics. Check back later.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`insight-card ${insight.type}`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {SEVERITY_ICONS[insight.type] || <Brain size={20} className="text-muted" />}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{insight.title}</span>
                      <span className={`badge ${SEVERITY_BADGES[insight.type]}`}>
                        {insight.type}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>{insight.category}</span>
                    </div>
                    <p className="text-sm text-secondary" style={{ lineHeight: 1.5, marginTop: '4px' }}>
                      {insight.description}
                    </p>
                  </div>
                </div>

                {insight.metric && (
                  <div
                    style={{
                      padding: '12px 20px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      minWidth: '120px',
                    }}
                  >
                    <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flagged Value</span>
                    <span className="text-sm font-semibold text-mono text-gradient" style={{ display: 'block', marginTop: '4px' }}>{insight.metric}</span>
                  </div>
                )}
              </div>

              {/* Recommendation divider */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <TrendingUp size={16} className="text-primary" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <span className="text-xs font-semibold text-primary" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommendation</span>
                  <p className="text-sm text-primary-hover" style={{ marginTop: '4px', lineHeight: 1.4 }}>{insight.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
