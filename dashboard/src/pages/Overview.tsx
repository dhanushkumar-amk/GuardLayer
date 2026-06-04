import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { analyticsApi, threatsApi, auditApi } from '../lib/api';
import type { ThreatLog, AuditLog } from '../types';

export const Overview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for Analytics Summary
  const [summaryData, setSummaryData] = useState<{
    total_requests: number;
    blocked_requests: number;
    block_rate: number;
    threats_by_type: Record<string, number>;
    requests_over_time: { bucket: string; count: number }[];
    top_threat_types: { threat_type: string; count: number }[];
    pii_detections_count: number;
    average_latency_ms: number;
  } | null>(null);

  // States for Recent lists
  const [recentThreats, setRecentThreats] = useState<ThreatLog[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditLog[]>([]);

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    
    setError(null);
    try {
      // Fetch summary and recent lists in parallel
      const [summaryRes, threatsRes, auditsRes] = await Promise.all([
        analyticsApi.getAnalyticsSummary('24h'),
        threatsApi.getRecentThreats(),
        auditApi.getAuditLogs(5)
      ]);

      setSummaryData(summaryRes);
      // Capped to last 5
      setRecentThreats((threatsRes || []).slice(0, 5));
      setRecentAudits((auditsRes?.data || []).slice(0, 5));
    } catch (err: any) {
      console.error(err);
      setError('Failed to load dashboard analytics. Retrying...');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Format timestamp helper
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = new Date().getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'recent';
    }
  };

  // Determine threat level dynamically
  const getThreatLevel = (rate: number) => {
    if (rate === 0) return { label: 'LOW', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (rate < 3) return { label: 'MEDIUM', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (rate < 10) return { label: 'HIGH', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { label: 'CRITICAL', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  // Skeleton Loader elements
  const renderSkeletons = () => (
    <div className="space-y-6 font-sans select-none animate-pulse">
      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="h-24 bg-[#0d0d11]/80 border border-[#17171e] rounded-2xl p-4 flex flex-col justify-between">
            <div className="h-3 w-20 bg-gray-800 rounded" />
            <div className="h-6 w-16 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-[#0d0d11]/80 border border-[#17171e] rounded-2xl p-4" />
        <div className="h-72 bg-[#0d0d11]/80 border border-[#17171e] rounded-2xl p-4" />
      </div>

      {/* Lists Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-[#0d0d11]/80 border border-[#17171e] rounded-2xl p-4" />
        <div className="h-64 bg-[#0d0d11]/80 border border-[#17171e] rounded-2xl p-4" />
      </div>
    </div>
  );

  // Dynamic SVG Area Chart Maker for Requests over time
  const renderLineChart = (data: { bucket: string; count: number }[]) => {
    if (!data || data.length === 0) return <div className="text-gray-500 text-xs py-10 text-center font-mono">No data points recorded.</div>;

    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find min and max
    const maxCount = Math.max(...data.map(d => d.count), 10);
    
    // Generate SVG path coordinates
    const points = data.map((d, index) => {
      const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.count / maxCount) * chartHeight;
      return { x, y };
    });

    const pathD = points.reduce((acc, p, index) => {
      return index === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    return (
      <svg className="w-full h-full text-orange-500/10" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="dashboardChartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0.0"/>
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#17171e" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={paddingLeft} y1={paddingTop + chartHeight * 0.5} x2={width - paddingRight} y2={paddingTop + chartHeight * 0.5} stroke="#17171e" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#17171e" strokeWidth="0.5" />

        {/* Chart fill Area & Line path */}
        <path d={areaD} fill="url(#dashboardChartGlow)" />
        <path d={pathD} fill="none" stroke="#ff5a1f" strokeWidth="1.5" />

        {/* Data point dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#ff5a1f" stroke="#000" strokeWidth="0.5" className="hover:r-4 transition-all" />
        ))}

        {/* Y Axis labels */}
        <text x={paddingLeft - 8} y={paddingTop + 4} fill="#52526b" fontSize="8" textAnchor="end" className="font-mono">{maxCount}</text>
        <text x={paddingLeft - 8} y={paddingTop + chartHeight * 0.5 + 4} fill="#52526b" fontSize="8" textAnchor="end" className="font-mono">{Math.round(maxCount * 0.5)}</text>
        <text x={paddingLeft - 8} y={paddingTop + chartHeight + 4} fill="#52526b" fontSize="8" textAnchor="end" className="font-mono">0</text>

        {/* X Axis labels */}
        {data.map((d, index) => {
          // Label only first, middle, last to prevent overlap
          if (index === 0 || index === Math.floor(data.length / 2) || index === data.length - 1) {
            const timeLabel = new Date(d.bucket).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
            return (
              <text
                key={index}
                x={points[index].x}
                y={height - 6}
                fill="#52526b"
                fontSize="8"
                textAnchor="middle"
                className="font-mono"
              >
                {timeLabel}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <PageHeader
          title="Overview"
          description="Monitor LLM security threats, guard outcomes, and gateway traffic in real-time."
        />
        {refreshing && (
          <span className="text-[10px] uppercase font-bold text-orange-500 font-mono flex items-center gap-1.5 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20 select-none animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
            <span>Syncing Live Node</span>
          </span>
        )}
      </div>

      {loading ? (
        renderSkeletons()
      ) : error || !summaryData ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 max-w-lg mx-auto select-none animate-fadeIn">
          <div className="relative mb-6">
            <div className="absolute -inset-1 rounded-full bg-rose-500/20 blur-lg animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-[#0d0d11]/80 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <h3 className="text-base font-bold text-white mb-2 text-center tracking-tight">API Node Offline</h3>
          <p className="text-xs text-gray-400 mb-6 text-center max-w-sm leading-relaxed">
            {error || 'Unable to connect to the GuardLayer backend nodes. Verify that your services are active.'}
          </p>
          <button
            onClick={() => fetchDashboardData()}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-full shadow-lg shadow-rose-500/10 border border-rose-500/20 transition-all duration-300 transform active:scale-95 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Reconnect Nodes
          </button>
        </div>
      ) : summaryData.total_requests === 0 ? (
        <Card className="bg-[#0d0d11]/80 backdrop-blur-md border border-[#17171e] rounded-2xl p-12">
          <EmptyState
            title="No Gateway Logs Yet"
            description="Run the GuardLayer Docker proxy locally and pass client API calls through it to populate live security data."
            actionText="Refresh Dashboard"
            onAction={() => fetchDashboardData()}
            icon={
              <svg className="w-8 h-8 text-[#ff5a1f]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
              </svg>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6 font-sans">
          
          {/* 4 Stat Cards in a row at top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat 1: Total Requests */}
            <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 hover:border-[#ff5a1f]/20 rounded-2xl p-5 flex flex-col justify-between h-24 transition-all duration-300">
              <span className="text-xs text-gray-400 font-medium">Total Requests</span>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {summaryData.total_requests.toLocaleString()}
              </div>
            </div>

            {/* Stat 2: Blocked Requests */}
            <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 hover:border-[#ff5a1f]/20 rounded-2xl p-5 flex flex-col justify-between h-24 transition-all duration-300">
              <span className="text-xs text-gray-400 font-medium">Blocked Requests</span>
              <div className="text-2xl font-extrabold text-[#ff5a1f] tracking-tight">
                {summaryData.blocked_requests.toLocaleString()}
              </div>
            </div>

            {/* Stat 3: PII Detections */}
            <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 hover:border-[#ff5a1f]/20 rounded-2xl p-5 flex flex-col justify-between h-24 transition-all duration-300">
              <span className="text-xs text-gray-400 font-medium">PII Scrubbed Logs</span>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {summaryData.pii_detections_count.toLocaleString()}
              </div>
            </div>

            {/* Stat 4: Threat Level */}
            <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 hover:border-[#ff5a1f]/20 rounded-2xl p-5 flex flex-col justify-between h-24 transition-all duration-300">
              <span className="text-xs text-gray-400 font-medium">Dynamic Threat Rating</span>
              <div className="flex items-center justify-between">
                <div className="text-xl font-extrabold text-white tracking-tight">
                  {summaryData.block_rate.toFixed(1)}%
                </div>
                <span className={`text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 border rounded-full ${getThreatLevel(summaryData.block_rate).color}`}>
                  {getThreatLevel(summaryData.block_rate).label}
                </span>
              </div>
            </div>

          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Requests Over Time Line Chart */}
            <div className="lg:col-span-2 bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-5 flex flex-col justify-between h-72">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Requests Over Time</h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">GATEWAY TRAFFIC BUCKET</p>
                </div>
                <span className="text-[9px] text-[#ff5a1f] bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                  24h activity
                </span>
              </div>
              <div className="flex-1 w-full h-full relative">
                {renderLineChart(summaryData.requests_over_time)}
              </div>
            </div>

            {/* Threats by Type Bar Chart */}
            <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-5 flex flex-col justify-between h-72">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight mb-0.5">Threat Vectors</h3>
                <p className="text-[10px] text-gray-500 font-mono mb-4 uppercase">detections by classifier type</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {Object.keys(summaryData.threats_by_type || {}).length === 0 ? (
                  <div className="text-gray-500 text-xs py-12 text-center font-mono">No threats recorded yet.</div>
                ) : (
                  Object.entries(summaryData.threats_by_type).map(([type, count]) => {
                    const totalThreats = Object.values(summaryData.threats_by_type).reduce((a, b) => a + b, 0);
                    const percentage = totalThreats > 0 ? (count / totalThreats) * 100 : 0;
                    
                    return (
                      <div key={type} className="space-y-1 text-left font-sans text-xs">
                        <div className="flex justify-between text-gray-300 font-medium">
                          <span className="capitalize">{type}</span>
                          <span className="font-mono text-gray-400 font-bold">{count}</span>
                        </div>
                        {/* Dynamic Progress Bar */}
                        <div className="w-full h-1.5 bg-[#000000] border border-[#17171e] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-[#ff5a1f] rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(percentage, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Bottom lists row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Threats Table */}
            <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight mb-0.5">Recent Threat Interceptions</h3>
                <p className="text-[10px] text-gray-500 font-mono mb-4 uppercase">Last 5 security overrides</p>
              </div>

              <div className="flex-1 overflow-x-auto">
                {recentThreats.length === 0 ? (
                  <div className="text-gray-500 text-xs py-14 text-center font-mono select-none">No threat logs available.</div>
                ) : (
                  <table className="w-full text-left font-mono text-[11px] text-gray-300 border-collapse">
                    <thead>
                      <tr className="border-b border-[#17171e]/80 text-gray-500 font-bold uppercase select-none">
                        <th className="pb-2">Vector</th>
                        <th className="pb-2 text-center">Score</th>
                        <th className="pb-2 text-right">Detected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentThreats.map((threat) => (
                        <tr key={threat.id} className="border-b border-[#17171e]/40 hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 font-sans font-bold text-white capitalize">{(threat as any).threat_type || threat.classification || 'Unknown'}</td>
                          <td className="py-2.5 text-center font-mono">
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold">
                              {(threat as any).threat_score ? Number((threat as any).threat_score).toFixed(2) : '1.00'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-gray-500 font-medium">
                            {formatTime(threat.timestamp || (threat as any).detected_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Recent Audit Logs Table */}
            <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight mb-0.5">Gateway Traffic Logs</h3>
                <p className="text-[10px] text-gray-500 font-mono mb-4 uppercase">Last 5 requests outcome</p>
              </div>

              <div className="flex-1 overflow-x-auto">
                {recentAudits.length === 0 ? (
                  <div className="text-gray-500 text-xs py-14 text-center font-mono select-none">No audit traffic recorded.</div>
                ) : (
                  <table className="w-full text-left font-mono text-[11px] text-gray-300 border-collapse">
                    <thead>
                      <tr className="border-b border-[#17171e]/80 text-gray-500 font-bold uppercase select-none">
                        <th className="pb-2">Input Preview</th>
                        <th className="pb-2 text-center">Status</th>
                        <th className="pb-2 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAudits.map((audit) => (
                        <tr key={audit.id} className="border-b border-[#17171e]/40 hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-4 text-gray-300 max-w-[180px] truncate select-text">
                            {(audit as any).original_input || audit.details || 'Empty payload'}
                          </td>
                          <td className="py-2.5 text-center select-none">
                            {(audit as any).was_blocked || audit.action === 'blocked' ? (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">
                                Blocked
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">
                                Allowed
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-gray-500 font-medium">
                            {formatTime(audit.timestamp || (audit as any).created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </MainLayout>
  );
};

export default Overview;
