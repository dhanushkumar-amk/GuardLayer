import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import { threatsApi } from '../lib/api';
import { useNotificationsStore } from '../store/notifications.store';
import useSSE from '../hooks/useSSE';
import LiveIndicator from '../components/ui/LiveIndicator';
import type { ThreatLog } from '../types';

export const Threats: React.FC = () => {
  const { setHasNewThreat } = useNotificationsStore();

  // Core Data States
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [threatType, setThreatType] = useState<string>('');
  const [apiKeyId, setApiKeyId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 12;

  // UI Detail States
  const [expandedThreats, setExpandedThreats] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isCopiedId, setIsCopiedId] = useState<string | null>(null);

  // Clear badge on mount
  useEffect(() => {
    setHasNewThreat(false);
  }, [setHasNewThreat]);

  // Fetch threats
  const fetchThreats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await threatsApi.getThreats({
        threat_type: threatType || undefined,
        api_key_id: apiKeyId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit,
      });

      setThreats(res.data || []);
      setTotalCount(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch threat logs. Connection offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, [threatType, apiKeyId, fromDate, toDate, page]);

  // Audio alert ping
  const playNotificationPing = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  const { status, lastThreatEvent } = useSSE();

  useEffect(() => {
    if (lastThreatEvent) {
      const newThreat = lastThreatEvent as ThreatLog;
      const matchesType = !threatType || (newThreat as any).threat_type === threatType;
      const matchesKey = !apiKeyId || (newThreat as any).api_key_id?.includes(apiKeyId);
      
      if (matchesType && matchesKey) {
        setThreats((prev) => {
          if (prev.some(t => t.id === newThreat.id)) return prev;
          const newThreatWithFlash = { ...newThreat, isNew: true };
          const updated = [newThreatWithFlash, ...prev];
          if (updated.length > limit) {
            updated.pop();
          }
          return updated;
        });
        setTotalCount((c) => c + 1);
        playNotificationPing();
      }
    }
  }, [lastThreatEvent, threatType, apiKeyId]);

  // Toggle expanded rows
  const toggleRow = (id: string) => {
    const next = new Set(expandedThreats);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedThreats(next);
  };

  // Clear filters
  const handleClearFilters = () => {
    setThreatType('');
    setApiKeyId('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // Copy to clipboard
  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedId(id);
    setTimeout(() => setIsCopiedId(null), 1500);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (threats.length === 0) return;

    const headers = ['ID', 'Threat Type', 'Score', 'API Key ID', 'Guard Name', 'Detected At', 'Payload'];
    const rows = threats.map((t) => [
      t.id,
      (t as any).threat_type || t.classification || 'unknown',
      (t as any).threat_score || 1.0,
      (t as any).api_key_id || 'unknown',
      (t as any).guard_name || 'unknown',
      t.timestamp || (t as any).detected_at || '',
      (t.requestText || (t as any).original_input || '').replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((val) => `"${val}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `guardlayer_threats_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format detected time
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'recent';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return 'recent';
    }
  };

  // Category badges styles
  const getBadgeClass = (type: string) => {
    const raw = type.toLowerCase().replace(/_/g, ' ');
    if (raw.includes('prompt injection')) {
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
    if (raw.includes('jailbreak')) {
      return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    }
    if (raw.includes('pii') || raw.includes('scrub')) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    if (raw.includes('toxicity') || raw.includes('abuse')) {
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  const getPrimaryVector = () => {
    if (threats.length === 0) return 'None';
    const counts: Record<string, number> = {};
    threats.forEach((t) => {
      const type = (t as any).threat_type || t.classification || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0].replace(/_/g, ' ');
  };

  return (
    <MainLayout>
      {/* Header section with page detail description */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="Threat Intelligence"
          description="Review blocked prompts, jailbreaks, PII scrubbing actions, and active policy overrides."
        />
        
        {/* Connection status and sound toggle */}
        <div className="flex items-center gap-3 select-none">
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#ff5a1f]/10 border-[#ff5a1f]/30 text-[#ff5a1f]'
                : 'bg-[#15151c] border-[#17171e] text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Mute Alert Sound' : 'Unmute Alert Sound'}
          >
            {soundEnabled ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H3a1 1 0 00-1 1v4a1 1 0 001 1h1.5l2.75 2.25c.63.51 1.57.06 1.57-.75V8.5c0-.81-.94-1.26-1.57-.75z" />
              </svg>
            )}
          </button>

          <LiveIndicator status={status} />
        </div>
      </div>

      <div className="space-y-6 font-sans">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 hover:border-[#ff5a1f]/10 rounded-2xl p-5 flex items-center justify-between h-20 transition-all duration-300">
            <div>
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest block mb-0.5">Blocked Incidents</span>
              <span className="text-2xl font-extrabold text-[#ff5a1f] tracking-tight">{totalCount.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 flex items-center justify-center text-[#ff5a1f]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 hover:border-[#ff5a1f]/10 rounded-2xl p-5 flex items-center justify-between h-20 transition-all duration-300">
            <div>
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest block mb-0.5">Primary Vector</span>
              <span className="text-sm font-extrabold text-white capitalize tracking-tight">{getPrimaryVector()}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 hover:border-[#ff5a1f]/10 rounded-2xl p-5 flex items-center justify-between h-20 transition-all duration-300">
            <div>
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest block mb-0.5">Shield Policy</span>
              <span className="text-sm font-extrabold text-emerald-400 capitalize tracking-tight flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Enforcing
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

        </div>

        {/* Filtering Panel */}
        <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          
          <div className="relative min-w-[170px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <select
              value={threatType}
              onChange={(e) => { setThreatType(e.target.value); setPage(1); }}
              className="w-full bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 text-xs pl-9 pr-8 py-2 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]/30 appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="prompt_injection">Prompt Injection</option>
              <option value="jailbreak">Jailbreak</option>
              <option value="pii">PII Detected</option>
              <option value="toxicity">Toxicity & Abuse</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative flex-grow min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search API Key ID..."
              value={apiKeyId}
              onChange={(e) => { setApiKeyId(e.target.value); setPage(1); }}
              className="w-full bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 placeholder-slate-600 text-xs pl-9 pr-3 py-2 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]/30"
            />
          </div>

          <div className="flex items-center gap-2 bg-[#121217] border border-[#17171e] hover:border-slate-800 transition-colors px-3 py-1.5 rounded-lg">
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="bg-transparent border-0 text-slate-300 text-xs focus:outline-none focus:ring-0 font-mono py-0 w-28 cursor-pointer [color-scheme:dark]"
              title="From Date"
            />
            <span className="text-slate-600 text-xs font-mono">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="bg-transparent border-0 text-slate-300 text-xs focus:outline-none focus:ring-0 font-mono py-0 w-28 cursor-pointer [color-scheme:dark]"
              title="To Date"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {(threatType || apiKeyId || fromDate || toDate) && (
              <button
                onClick={handleClearFilters}
                className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white bg-[#1a1a24] hover:bg-[#232330] border border-[#232330] rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={handleExportCSV}
              disabled={threats.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-[#15151c] hover:bg-[#1f1f2a] border border-[#17171e] hover:border-[#ff5a1f]/20 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <svg className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>

        </div>

        {/* Incident List Card */}
        <Card className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-0 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center select-none animate-pulse">
              <div className="w-7 h-7 rounded-full border-2 border-[#ff5a1f] border-t-transparent animate-spin mb-4" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">Syncing Security Incidents...</span>
            </div>
          ) : error ? (
            <div className="py-20 text-center select-none">
              <svg className="w-12 h-12 text-rose-500/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-sm font-bold text-white mb-1.5">Network Node Failure</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">{error}</p>
              <button onClick={fetchThreats} className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-full hover:bg-rose-500 transition-colors cursor-pointer">
                Retry Query
              </button>
            </div>
          ) : threats.length === 0 ? (
            <div className="py-28 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-[#121217] border border-[#17171e] flex items-center justify-center text-slate-600 mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Clear Threat History</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">No matching threat incidents were logged under the current filters.</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-[#17171e]/60 text-slate-500 font-bold uppercase select-none text-[9px] tracking-widest bg-slate-900/10">
                      <th className="py-3 px-5">Threat Type</th>
                      <th className="py-3 px-5 text-center">Severity Score</th>
                      <th className="py-3 px-5">API Key ID</th>
                      <th className="py-3 px-5">Intercept Guard</th>
                      <th className="py-3 px-5 text-right">Detected Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#17171e]/20">
                    {threats.map((threat) => {
                      const id = threat.id;
                      const score = Number((threat as any).threat_score || 0);
                      const isHigh = score >= 0.8;
                      const isExpanded = expandedThreats.has(id);
                      
                      return (
                        <React.Fragment key={id}>
                          <tr
                            onClick={() => toggleRow(id)}
                            className={`hover:bg-[#121217]/50 active:bg-[#121217]/30 cursor-pointer transition-all duration-200 border-l-2 ${
                              isExpanded ? 'bg-[#121217]/30 border-l-[#ff5a1f]' : 'border-l-transparent'
                            } ${(threat as any).isNew ? 'animate-flash' : ''}`}
                          >
                            <td className="py-3 px-5">
                              <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-sans font-bold capitalize select-none ${getBadgeClass((threat as any).threat_type || threat.classification || 'unknown')}`}>
                                {((threat as any).threat_type || threat.classification || 'unknown').replace(/_/g, ' ')}
                              </span>
                            </td>

                            <td className="py-3 px-5 w-48">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-8 font-mono font-bold text-right text-xs ${isHigh ? 'text-red-400 font-black' : 'text-slate-400'}`}>
                                  {score.toFixed(2)}
                                </span>
                                <div className="flex-1 h-1.5 bg-black border border-[#1d1d26] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isHigh
                                        ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                        : score >= 0.5
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                    }`}
                                    style={{ width: `${score * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-5 text-slate-400 font-mono text-[10px] select-all truncate max-w-[150px]">
                              {(threat as any).api_key_id || 'unknown'}
                            </td>

                            <td className="py-3 px-5 text-slate-300 font-semibold font-sans">
                              <div className="flex items-center gap-1.5">
                                <svg className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span>{(threat as any).guard_name || 'System Guardrail'}</span>
                              </div>
                            </td>

                            <td className="py-3 px-5 text-slate-500 font-medium font-mono text-[10px]">
                              <div className="flex items-center justify-end gap-1.5">
                                <svg className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{formatTime(threat.timestamp || (threat as any).detected_at)}</span>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-black/30">
                              <td colSpan={5} className="py-4 px-5">
                                <div className="border border-[#1d1d26] rounded-xl bg-[#080710]/80 overflow-hidden shadow-inner font-sans select-text">
                                  <div className="bg-[#0e0e14] px-4 py-2 border-b border-[#1c1c28] flex justify-between items-center select-none">
                                    <div className="flex items-center gap-2">
                                      <div className="flex gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                                      </div>
                                      <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest ml-2">
                                        Adversarial Input Inspector
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleCopyToClipboard(threat.requestText || (threat as any).original_input || '', id)}
                                      className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-[#15151c] border border-[#17171e] hover:border-[#ff5a1f]/30 px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-sm active:scale-95"
                                    >
                                      {isCopiedId === id ? 'Copied to clipboard' : 'Copy Prompt'}
                                    </button>
                                  </div>
                                  
                                  <pre className="text-xs text-emerald-400 bg-black p-4 overflow-x-auto border-t-0 border-[#1c1c28] font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto shadow-inner">
                                    {threat.requestText || (threat as any).original_input || 'No input content captured.'}
                                  </pre>

                                  <div className="bg-[#0e0e14]/50 border-t border-[#1c1c28] px-4 py-2 flex flex-wrap gap-4 text-[9px] text-slate-500 font-mono select-none">
                                    <span>INCIDENT_ID: {threat.id}</span>
                                    <span>•</span>
                                    <span>REQUEST_ID: {threat.request_id || 'N/A'}</span>
                                    <span>•</span>
                                    <span>PAYLOAD_SIZE: {(threat.requestText || (threat as any).original_input || '').length} bytes</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="border-t border-[#17171e]/40 p-4 flex items-center justify-between font-mono text-[9px] select-none bg-black/10">
                  <span className="text-slate-500 uppercase tracking-widest font-bold">
                    Page <strong className="text-slate-300">{page}</strong> of <strong className="text-slate-300">{totalPages}</strong>
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 bg-[#15151c] border border-[#17171e] hover:border-[#ff5a1f]/20 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all cursor-pointer font-bold"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 bg-[#15151c] border border-[#17171e] hover:border-[#ff5a1f]/20 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all cursor-pointer font-bold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

      </div>
    </MainLayout>
  );
};

export default Threats;
