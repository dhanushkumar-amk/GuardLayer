import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { analyticsApi } from '../lib/api';

type Period = '24h' | '7d' | '30d';

interface AnalyticsData {
  total_requests: number;
  blocked_requests: number;
  block_rate: number;
  threats_by_type: Record<string, number>;
  requests_over_time: { bucket: string; count: number; blocked: number }[];
  top_threat_types: { threat_type: string; count: number }[];
  pii_detections_count: number;
  average_latency_ms: number;
  latency_distribution: { range: string; count: number }[];
  most_active_api_keys: { key_prefix: string; count: number; blocked: number; block_rate: number }[];
}

export const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async (selectedPeriod: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getAnalytics(selectedPeriod);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const formatThreatType = (type: string) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      if (period === '24h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (error) {
      return tickItem;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formattedLabel = formatXAxis(label);
      return (
        <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-3 shadow-xl font-mono text-[10px] select-none">
          <p className="text-slate-500 font-bold uppercase tracking-wider mb-1.5">{formattedLabel}</p>
          <div className="space-y-1">
            {payload.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4">
                <span className="text-slate-400 font-medium uppercase tracking-wider">{p.name}:</span>
                <span className="font-bold text-white animate-fadeIn" style={{ color: p.color || '#fff' }}>
                  {p.value.toLocaleString()}{p.name.includes('%') || p.name.includes('Rate') ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const StatCardSkeleton = () => (
    <div className="h-24 bg-[#0d0d11]/80 border border-[#17171e] rounded-2xl p-4 flex flex-col justify-between animate-pulse">
      <div className="h-3 w-20 bg-slate-800 rounded" />
      <div className="h-6 w-16 bg-slate-800 rounded" />
    </div>
  );

  const ChartSkeleton = () => (
    <div className="h-72 flex flex-col justify-between p-5 bg-[#0d0d11]/40 border border-[#17171e]/50 rounded-2xl animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 w-36 bg-slate-800 rounded" />
        <div className="h-3 w-16 bg-slate-800 rounded" />
      </div>
      <div className="flex-1 flex items-end gap-3 mt-6">
        <div className="w-full h-1/3 bg-slate-900/60 rounded" />
        <div className="w-full h-1/2 bg-slate-900/60 rounded" />
        <div className="w-full h-3/4 bg-slate-900/60 rounded" />
        <div className="w-full h-2/3 bg-slate-900/60 rounded" />
        <div className="w-full h-1/2 bg-slate-900/60 rounded" />
        <div className="w-full h-4/5 bg-slate-900/60 rounded" />
      </div>
    </div>
  );

  const ChartEmptyState = ({ title }: { title: string }) => (
    <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#0d0d11]/20 border border-dashed border-[#17171e] rounded-2xl">
      <svg className="h-8 w-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-xs font-semibold text-slate-400">No data available for {title}</p>
      <p className="text-[10px] text-slate-600 mt-1">There were no records logged for the selected timeframe.</p>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0d0d11] border border-[#17171e] rounded-2xl max-w-md mx-auto my-12 font-sans">
      <div className="text-red-500 bg-red-500/10 p-3 rounded-full border border-red-500/20 mb-4">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Connection Interrupted</h3>
      <p className="text-xs text-slate-500 mt-1 mb-6">Failed to retrieve analytics metrics from the gateway logs.</p>
      <Button variant="secondary" size="sm" onClick={() => fetchAnalytics(period)}>
        Retry Connection
      </Button>
    </div>
  );

  // Compute total threats count for percentage calculations
  const totalThreatsCount = data?.top_threat_types?.reduce((acc, t) => acc + t.count, 0) || 0;

  // Process data for Area chart (Block rate percentage over time)
  const blockRateOverTimeData = data?.requests_over_time?.map((item) => {
    const rate = item.count > 0 ? (item.blocked / item.count) * 100 : 0;
    return {
      bucket: item.bucket,
      block_rate: parseFloat(rate.toFixed(2)),
    };
  }) || [];

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <PageHeader
          title="Analytics Dashboard"
          description="Analyze system throughput, guard trigger frequencies, and performance latency."
        />

        {/* Period Selector */}
        <div className="flex items-center bg-[#0d0d11] border border-[#17171e] rounded-xl p-1 font-mono text-[10px] font-bold select-none">
          {(['24h', '7d', '30d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg transition-all uppercase cursor-pointer ${
                period === p
                  ? 'bg-[#ff5a1f] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#1a1a24]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState />
      ) : (
        <div className="space-y-6 font-sans">
          
          {/* STATS CARD ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {loading || !data ? (
              [...Array(5)].map((_, idx) => <StatCardSkeleton key={idx} />)
            ) : (
              <>
                {/* 1. Total Requests */}
                <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-4.5 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Total Requests</span>
                  <span className="text-xl font-bold font-mono text-white mt-2">
                    {data.total_requests.toLocaleString()}
                  </span>
                </div>

                {/* 2. Blocked Requests */}
                <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-4.5 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Blocked Requests</span>
                  <span className="text-xl font-bold font-mono text-rose-500 mt-2">
                    {data.blocked_requests.toLocaleString()}
                  </span>
                </div>

                {/* 3. Block Rate */}
                <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-4.5 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Block Rate</span>
                  <span className="text-xl font-bold font-mono text-[#ff5a1f] mt-2">
                    {data.block_rate.toFixed(1)}%
                  </span>
                </div>

                {/* 4. Average Latency */}
                <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-4.5 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Average Latency</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-2">
                    {data.average_latency_ms} ms
                  </span>
                </div>

                {/* 5. PII Detections */}
                <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-4.5 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">PII Detections</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-2">
                    {data.pii_detections_count.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* CHARTS GRID SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Requests Over Time (Line Chart) */}
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Requests Over Time</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Total requests throughput vs blocked events.</p>
              </div>

              {loading || !data ? (
                <ChartSkeleton />
              ) : data.requests_over_time.length === 0 ? (
                <ChartEmptyState title="Requests Over Time" />
              ) : (
                <div className="h-64 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.requests_over_time} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" opacity={0.06} vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        tickFormatter={formatXAxis}
                        tick={{ fill: '#52526b', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#52526b', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={6}
                        wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: '#888' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Total Requests"
                        stroke="#ff5a1f"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="blocked"
                        name="Blocked Requests"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Block Rate Over Time (Area Chart) */}
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Block Rate Trends</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Ratio of blocked queries to allowed queries over time.</p>
              </div>

              {loading || !data ? (
                <ChartSkeleton />
              ) : blockRateOverTimeData.length === 0 ? (
                <ChartEmptyState title="Block Rate Trends" />
              ) : (
                <div className="h-64 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={blockRateOverTimeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="blockRateGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" opacity={0.06} vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        tickFormatter={formatXAxis}
                        tick={{ fill: '#52526b', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: '#52526b', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="block_rate"
                        name="Block Rate"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#blockRateGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 3: Threats By Type (Horizontal Bar Chart) */}
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Threat Breakdown</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Distribution of security guard activations by categorization.</p>
              </div>

              {loading || !data ? (
                <ChartSkeleton />
              ) : data.top_threat_types.length === 0 ? (
                <ChartEmptyState title="Threat Breakdown" />
              ) : (
                <div className="h-64 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={data.top_threat_types}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" opacity={0.06} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: '#52526b', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="threat_type"
                        tickFormatter={formatThreatType}
                        tick={{ fill: '#52526b', fontSize: 8, fontFamily: 'monospace' }}
                        width={90}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Detections" fill="#ff5a1f" radius={[0, 4, 4, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 4: Latency Distribution (Vertical Bar Chart) */}
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Performance Overhead</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Frequency count of request latencies grouped in intervals.</p>
              </div>

              {loading || !data ? (
                <ChartSkeleton />
              ) : data.latency_distribution.length === 0 ? (
                <ChartEmptyState title="Latency Distribution" />
              ) : (
                <div className="h-64 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.latency_distribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" opacity={0.06} vertical={false} />
                      <XAxis
                        dataKey="range"
                        tick={{ fill: '#52526b', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#52526b', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Requests" fill="#ff5a1f" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

          {/* BOTTOM SECTION TABLES/LISTS */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Top Threat Types Ranked (Column span 2) */}
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Ranked Threat Vectors</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Top threat categories ranked by incident rates.</p>
              </div>

              {loading || !data ? (
                <div className="space-y-4 py-4 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-slate-900 rounded" />
                  ))}
                </div>
              ) : data.top_threat_types.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 italic font-mono">No logged incidents found.</div>
              ) : (
                <div className="space-y-4 py-2">
                  {data.top_threat_types.slice(0, 5).map((threat, index) => {
                    const pct = totalThreatsCount > 0 ? (threat.count / totalThreatsCount) * 100 : 0;
                    return (
                      <div key={threat.threat_type} className="space-y-1.5 font-mono text-[10px]">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-bold">
                            {index + 1}. {formatThreatType(threat.threat_type)}
                          </span>
                          <span className="font-bold text-white">
                            {threat.count} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#16161f] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#ff5a1f] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active API Keys Table (Column span 3) */}
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Most Active API Keys</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Performance indices sorted by query throughput.</p>
              </div>

              {loading || !data ? (
                <div className="space-y-3 py-4 animate-pulse">
                  <div className="h-5 bg-slate-900 rounded w-1/3" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-900 rounded" />
                  ))}
                </div>
              ) : data.most_active_api_keys.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 italic font-mono">No keys recorded in traffic logs.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#17171e] text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 pl-3">API Key Prefix</th>
                        <th className="pb-3 text-right">Total Requests</th>
                        <th className="pb-3 text-right">Blocked Requests</th>
                        <th className="pb-3 text-right pr-3">Block Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#17171e]/50">
                      {data.most_active_api_keys.map((key, i) => (
                        <tr key={i} className="hover:bg-[#121217]/50 font-mono">
                          <td className="py-3 pl-3 text-white font-bold">{key.key_prefix}</td>
                          <td className="py-3 text-right text-slate-300">{key.count.toLocaleString()}</td>
                          <td className="py-3 text-right text-rose-400">{key.blocked.toLocaleString()}</td>
                          <td className="py-3 text-right pr-3 text-[#ff5a1f] font-bold">{key.block_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </MainLayout>
  );
};

export default Analytics;
