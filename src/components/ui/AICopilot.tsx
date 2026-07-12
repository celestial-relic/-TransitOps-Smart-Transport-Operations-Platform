'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, User, Brain, AlertTriangle, RefreshCw, CheckCircle, HelpCircle } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  type?: 'general' | 'vehicles' | 'drivers' | 'maintenance' | 'fuel';
  dataList?: { label: string; detail: string; status?: 'success' | 'warning' | 'danger' | 'neutral' }[];
}

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load stats dynamically so we can answer real data questions
  const { data: stats } = useFetch<any>('/api/dashboard/stats');
  const { data: vehicles } = useFetch<any>('/api/vehicles');
  const { data: drivers } = useFetch<any>('/api/drivers');
  const { data: maintenance } = useFetch<any>('/api/maintenance');

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        text: "Hello! I am your AI Operations Copilot. I analyze your live fleet, trip schedules, fuel usage, and maintenance logs in real-time. Ask me anything about your transport operations!",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate AI thinking and process response
    setTimeout(() => {
      const response = processQuery(textToSend);
      setMessages((prev) => [...prev, response]);
      setTyping(false);
    }, 1200);
  };

  const processQuery = (query: string): Message => {
    const q = query.toLowerCase();
    
    // Extract actual counts/records from state
    const vehicleList = Array.isArray(vehicles) ? vehicles : vehicles?.vehicles || [];
    const driverList = Array.isArray(drivers) ? drivers : drivers?.drivers || [];
    const maintenanceList = Array.isArray(maintenance) ? maintenance : [];

    const activeCount = vehicleList.filter((v: any) => v.status === 'ACTIVE').length;
    const maintenanceCount = vehicleList.filter((v: any) => v.status === 'MAINTENANCE').length;
    const totalVehicles = vehicleList.length;

    const availableDrivers = driverList.filter((d: any) => d.status === 'AVAILABLE').length;
    const onTripDrivers = driverList.filter((d: any) => d.status === 'ON_TRIP').length;
    const totalDrivers = driverList.length;

    // Helper: Fleet Summary
    if (q.includes('summary') || q.includes('fleet') || q.includes('status') || q.includes('overview')) {
      return {
        sender: 'ai',
        text: `Here is a real-time summary of your operations:
• **Fleet Status**: ${activeCount} active, ${maintenanceCount} in maintenance out of ${totalVehicles} total buses/vehicles.
• **Driver Availability**: ${availableDrivers} available, ${onTripDrivers} currently on active trips.
• **Active Workload**: ${stats?.activeTrips || 0} trips dispatched or in transit.
• **Fleet Utilization Rate**: ${totalVehicles > 0 ? Math.round((activeCount / totalVehicles) * 100) : 0}%`,
        timestamp: new Date(),
        type: 'general',
        dataList: [
          { label: 'Active Vehicles', detail: `${activeCount} / ${totalVehicles}`, status: 'success' },
          { label: 'Buses in Maintenance', detail: `${maintenanceCount}`, status: 'warning' },
          { label: 'Available Drivers', detail: `${availableDrivers} / ${totalDrivers}`, status: 'success' },
          { label: 'Fleet Utilization', detail: `${totalVehicles > 0 ? Math.round((activeCount / totalVehicles) * 100) : 0}%`, status: 'neutral' },
        ]
      };
    }

    // Helper: Maintenance
    if (q.includes('maintenance') || q.includes('repair') || q.includes('overdue') || q.includes('wrench')) {
      const overdue = maintenanceList.filter((m: any) => m.status === 'SCHEDULED' && new Date(m.scheduledDate) < new Date());
      if (overdue.length > 0) {
        return {
          sender: 'ai',
          text: `⚠️ **Critical Maintenance Alert**: There are ${overdue.length} maintenance schedules past their target dates! Please prioritize these immediately to avoid structural breakdowns.`,
          timestamp: new Date(),
          type: 'maintenance',
          dataList: overdue.map((m: any) => ({
            label: `${m.vehicle?.registrationNumber || 'Vehicle'} - ${m.type}`,
            detail: `${m.issue} (Scheduled: ${new Date(m.scheduledDate).toLocaleDateString()})`,
            status: 'danger'
          }))
        };
      }
      return {
        sender: 'ai',
        text: `🔧 **Maintenance Status**: All current maintenance schedules are up to date. We have ${maintenanceCount} vehicle(s) currently undergoing inspections.`,
        timestamp: new Date(),
        type: 'maintenance',
        dataList: [
          { label: 'Vehicles Under Maintenance', detail: `${maintenanceCount}`, status: 'warning' },
          { label: 'Overdue schedules', detail: '0', status: 'success' }
        ]
      };
    }

    // Helper: Drivers
    if (q.includes('driver') || q.includes('safety') || q.includes('compliance') || q.includes('score')) {
      const lowScores = driverList.filter((d: any) => d.safetyScore < 75);
      if (lowScores.length > 0) {
        return {
          sender: 'ai',
          text: `⚠️ **Safety Score Alert**: There are ${lowScores.length} driver(s) with safety scores below the recommended threshold of 75/100. AI suggests scheduling coaching sessions.`,
          timestamp: new Date(),
          type: 'drivers',
          dataList: lowScores.map((d: any) => ({
            label: d.user?.name || 'Driver',
            detail: `Safety Score: ${d.safetyScore}/100 (Emp ID: ${d.employeeId})`,
            status: d.safetyScore < 60 ? 'danger' : 'warning'
          }))
        };
      }
      return {
        sender: 'ai',
        text: `✅ **Driver Audit**: Excellent! All registered drivers currently maintain safety scores above the 75/100 threshold. Fleet average safety score: ${
          driverList.length > 0 ? Math.round(driverList.reduce((sum: number, d: any) => sum + d.safetyScore, 0) / driverList.length) : 100
        }/100.`,
        timestamp: new Date(),
        type: 'drivers'
      };
    }

    // Helper: Fuel
    if (q.includes('fuel') || q.includes('consumption') || q.includes('liter') || q.includes('guzzl')) {
      return {
        sender: 'ai',
        text: `⛽ **Fuel Efficiency Diagnostic**:
• **Consumption Trend**: Moderate.
• **Optimization Suggestion**: Maintain vehicle speeds under 80 km/h, check tire pressure weekly, and enforce no-idling policies at transit hubs to cut fuel costs by up to 12%.
• **High Consumption Alerts**: Check vehicles currently registered with older maintenance logs.`,
        timestamp: new Date(),
        type: 'fuel'
      };
    }

    // Helper: Default
    return {
      sender: 'ai',
      text: `I understood your query about "${query}". Here are the operational controls available:
• Type **summary** to get a fleet status report.
• Type **maintenance** to list repair schedules and check for overdue items.
• Type **driver** to audit driver safety ratings.
• Type **fuel** to analyze consumption efficiencies.`,
      timestamp: new Date(),
    };
  };

  return (
    <>
      {/* Floating Sparkle Button */}
      <button
        className="ai-copilot-trigger"
        onClick={() => setIsOpen(true)}
        title="Open AI Operations Copilot"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.2)',
          zIndex: 999,
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.5), 0 0 30px rgba(99,102,241,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.2)';
        }}
      >
        <Sparkles size={24} className="animate-spin-slow" />
      </button>

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div
          className="ai-copilot-overlay"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(5, 8, 18, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            animation: 'fade-in 0.25s ease-out forwards',
          }}
        >
          <div
            className="ai-copilot-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',
              maxWidth: 420,
              height: '100%',
              background: 'rgba(15, 20, 36, 0.85)',
              backdropFilter: 'blur(30px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'between',
                background: 'rgba(255,255,255,0.01)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: 'var(--gradient-primary)',
                    padding: 8,
                    borderRadius: 8,
                    display: 'flex',
                  }}
                >
                  <Brain size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.02em' }}>AI Operations Copilot</h4>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                    Live Diagnostic Mode
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: '50%',
                  display: 'flex',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* Sender Label */}
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-tertiary)',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {msg.sender === 'ai' ? (
                      <>
                        <Bot size={11} /> Copilot AI
                      </>
                    ) : (
                      <>
                        User <User size={11} />
                      </>
                    )}
                  </div>
                  {/* Bubble */}
                  <div
                    className="glass-card-static"
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontSize: '0.8125rem',
                      whiteSpace: 'pre-line',
                      background: msg.sender === 'user' ? 'var(--primary-light)' : 'rgba(255,255,255,0.03)',
                      border: msg.sender === 'user' ? '1px solid var(--primary-glow)' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: 'none',
                    }}
                  >
                    {msg.text}

                    {/* Data List for formatted outputs */}
                    {msg.dataList && msg.dataList.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {msg.dataList.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              borderLeft: `3px solid ${
                                item.status === 'danger'
                                  ? 'var(--danger)'
                                  : item.status === 'warning'
                                  ? 'var(--warning)'
                                  : item.status === 'success'
                                  ? 'var(--success)'
                                  : 'var(--text-tertiary)'
                              }`,
                            }}
                          >
                            <span className="font-semibold">{item.label}</span>
                            <span className="text-muted">{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Loader */}
              {typing && (
                <div style={{ display: 'flex', alignSelf: 'flex-start', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Bot size={11} /> Copilot AI
                  </div>
                  <div
                    className="glass-card-static"
                    style={{
                      padding: '12px 20px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 16 }}>
                      <span className="typing-dot" />
                      <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
                      <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Drawer Footer */}
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(0,0,0,0.15)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {[
                { label: 'Fleet Status', query: 'fleet summary' },
                { label: 'Check Safety', query: 'driver safety scores' },
                { label: 'Maintenance Issues', query: 'overdue maintenance' },
                { label: 'Fuel Analysis', query: 'fuel consumption' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleSend(btn.query)}
                  className="btn btn-ghost btn-xs"
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <Sparkles size={11} style={{ marginRight: 4, color: 'var(--primary)' }} />
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              style={{
                padding: '16px 20px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: 10,
              }}
            >
              <input
                type="text"
                className="input-field"
                placeholder="Ask your Operations Copilot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{ borderRadius: 10, flex: 1 }}
                disabled={typing}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: 42, height: 42, padding: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                disabled={typing || !input.trim()}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
