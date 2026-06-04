import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import { auditApi } from '../lib/api';
import type { AuditLog as AuditLogType } from '../types';

export const AuditLog: React.FC = () => {
  // Core State
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters State
  const [search, setSearch] = useState<string>('');
  const [apiKeyId, setApiKeyId] = useState<string>('');
  const [wasBlocked, setWasBlocked] = useState<string>('');
  const [llmProvider, setLlmProvider] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25); // Page sizes: 25, 50, 100
  const [totalPages, setTotalPages] = useState<number>(1);

  // Auto Refresh State (Refreshes every 30s if on)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Drawer / Side Panel State
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLogDetails, setSelectedLogDetails] = useState<AuditLogType | null>(null);
  const [, setLoadingDetails] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'input' | 'output' | 'security'>('input');
  const [isCopiedField, setIsCopiedField] = useState<string | null>(null);

  // Fetch audit logs
  const fetchAuditLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await auditApi.getAuditLogs({
        api_key_id: apiKeyId || undefined,
        was_blocked: wasBlocked === '' ? undefined : wasBlocked,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        llm_provider: llmProvider || undefined,
        search: search || undefined,
        page,
        limit,
      });

      setLogs(res.data || []);
      setTotalCount(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch gateway audit logs. Connection offline.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial audit logs and refresh on filter changes
  useEffect(() => {
    fetchAuditLogs();
  }, [apiKeyId, wasBlocked, fromDate, toDate, llmProvider, search, page, limit]);

  // Handle auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAuditLogs(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, apiKeyId, wasBlocked, fromDate, toDate, llmProvider, search, page, limit]);

  // Fetch single log detail when selected
  useEffect(() => {
    if (!selectedLogId) {
      setSelectedLogDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const details = await auditApi.getAuditLogById(selectedLogId);
        setSelectedLogDetails(details);
        setDrawerOpen(true);
      } catch (err) {
        console.error('Failed to load audit details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedLogId]);

  // Helper to parse triggered guards list into badges
  const parseGuardsList = (log: AuditLogType) => {
    const list: string[] = [];
    
    // Check input guards triggered (stored as JSON string/record in db)
    const parseField = (field: any) => {
      if (!field) return;
      try {
        const obj = typeof field === 'string' ? JSON.parse(field) : field;
        Object.entries(obj).forEach(([name, status]) => {
          if (status === true || (status as any).triggered === true || (status as any).score > 0) {
            list.push(name.replace(/_guard$|_shield$/i, '').replace(/_/g, ' '));
          }
        });
      } catch (e) {
        // Fallback for simple strings or malformed records
        if (typeof field === 'string' && field.length > 2) {
          list.push(field);
        }
      }
    };

    parseField(log.input_guards_triggered || (log as any).input_guards_triggered);
    parseField(log.output_guards_triggered || (log as any).output_guards_triggered);
    
    return Array.from(new Set(list)); // Deduplicate
  };

  // Helper to copy strings to clipboard
  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedField(fieldName);
    setTimeout(() => setIsCopiedField(null), 1500);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setApiKeyId('');
    setWasBlocked('');
    setLlmProvider('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // Export logs to CSV file
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Request ID', 'API Key ID', 'Timestamp', 'Latency (ms)', 'Status', 'LLM Provider', 'LLM Model', 'Blocked Reason'];
    const rows = logs.map((log) => [
      log.id,
      log.api_key_id || 'unknown',
      log.timestamp || (log as any).created_at || '',
      log.latency_ms || 0,
      log.was_blocked || (log as any).was_blocked ? 'BLOCKED' : 'ALLOWED',
      log.llm_provider || 'N/A',
      log.llm_model || 'N/A',
      log.block_reason || 'N/A',
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((val) => `"${val}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `guardlayer_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'recent';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return 'recent';
    }
  };

  return (
    <MainLayout>
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="Security Auditing"
          description="Detailed inspection of LLM requests, response logs, latency indicators, and triggered system guardrails."
        />
        
        {/* Auto Refresh switch */}
        <div className="flex items-center gap-2 select-none bg-[#0d0d11]/60 border border-[#17171e]/80 px-3 py-1.5 rounded-lg">
          <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider cursor-pointer">
            Auto Refresh (30s)
          </label>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoRefresh ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                autoRefresh ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-6 font-sans">
        
        {/* Custom filters panel */}
        <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-4 space-y-3">
          {/* Row 1: Search Inputs */}
          <div className="flex flex-wrap gap-3">
            {/* Search query input */}
            <div className="relative flex-grow min-w-[250px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search Request ID or input prompt..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 placeholder-slate-600 text-xs pl-9 pr-3 py-2 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]/30"
              />
            </div>

            {/* API Key search input */}
            <div className="relative min-w-[200px] flex-grow md:flex-grow-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-3.414-1.414l-6.586 6.586a2 2 0 00-.586 1.414v2h2a2 2 0 001.414-.586l6.586-6.586M19 4a5 5 0 01-7 7L4 19v3h3l8-8a5 5 0 017-7z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Filter API Key ID..."
                value={apiKeyId}
                onChange={(e) => { setApiKeyId(e.target.value); setPage(1); }}
                className="w-full bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 placeholder-slate-600 text-xs pl-9 pr-3 py-2 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]/30"
              />
            </div>
          </div>

          {/* Row 2: Selectors, Dates, & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Blocked Status Dropdown */}
            <div className="relative min-w-[130px]">
              <select
                value={wasBlocked}
                onChange={(e) => { setWasBlocked(e.target.value); setPage(1); }}
                className="w-full bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 text-xs px-3 py-2 rounded-lg transition-all focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Outcomes</option>
                <option value="true">Blocked Only</option>
                <option value="false">Allowed Only</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Provider Dropdown */}
            <div className="relative min-w-[140px]">
              <select
                value={llmProvider}
                onChange={(e) => { setLlmProvider(e.target.value); setPage(1); }}
                className="w-full bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 text-xs px-3 py-2 rounded-lg transition-all focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Providers</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="litellm">LiteLLM Proxy</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2 bg-[#121217] border border-[#17171e] hover:border-slate-800 transition-colors px-3 py-2 rounded-lg">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="bg-transparent border-0 text-slate-300 text-xs focus:outline-none font-mono py-0 w-28 cursor-pointer [color-scheme:dark]"
                title="From Date"
              />
              <span className="text-slate-600 text-xs font-mono">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="bg-transparent border-0 text-slate-300 text-xs focus:outline-none font-mono py-0 w-28 cursor-pointer [color-scheme:dark]"
                title="To Date"
              />
            </div>

            {/* Actions & Page size */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide font-mono">Size</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-[#121217] border border-[#17171e] text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {(search || apiKeyId || wasBlocked || llmProvider || fromDate || toDate) && (
                <button
                  onClick={handleClearFilters}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white bg-[#1a1a24] hover:bg-[#232330] border border-[#232330] rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
              
              <button
                onClick={handleExportCSV}
                disabled={logs.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-[#15151c] hover:bg-[#1f1f2a] border border-[#17171e] hover:border-[#ff5a1f]/20 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>CSV</span>
              </button>
            </div>

          </div>
        </div>

        {/* Audit Log Table Card */}
        <Card className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-0 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center select-none animate-pulse">
              <div className="w-7 h-7 rounded-full border-2 border-[#ff5a1f] border-t-transparent animate-spin mb-4" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">Loading Audit Transactions...</span>
            </div>
          ) : error ? (
            <div className="py-20 text-center select-none">
              <svg className="w-12 h-12 text-rose-500/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-sm font-bold text-white mb-1.5">Network Node Failure</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">{error}</p>
              <button onClick={() => fetchAuditLogs()} className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-full hover:bg-rose-500 transition-colors cursor-pointer">
                Retry Connection
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-28 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-[#121217] border border-[#17171e] flex items-center justify-center text-slate-600 mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Clear Audit History</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">No transactions found under the current search parameters.</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-[#17171e]/60 text-slate-500 font-bold uppercase select-none text-[9px] tracking-widest bg-slate-900/10">
                      <th className="py-3.5 px-5">Request ID</th>
                      <th className="py-3.5 px-5">API Key ID</th>
                      <th className="py-3.5 px-5 text-right">Latency</th>
                      <th className="py-3.5 px-5 text-center">Status</th>
                      <th className="py-3.5 px-5">Provider & Model</th>
                      <th className="py-3.5 px-5">Guards Fired</th>
                      <th className="py-3.5 px-5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#17171e]/20">
                    {logs.map((log) => {
                      const id = log.id;
                      const blocked = log.was_blocked || (log as any).was_blocked;
                      const guards = parseGuardsList(log);
                      
                      return (
                        <tr
                          key={id}
                          onClick={() => setSelectedLogId(id)}
                          className={`hover:bg-[#121217]/50 active:bg-[#121217]/30 cursor-pointer transition-all duration-200 border-l-2 ${
                            blocked 
                              ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06] border-l-red-500' 
                              : 'border-l-transparent'
                          }`}
                        >
                          {/* Request ID */}
                          <td className="py-3.5 px-5 text-slate-300 font-mono text-[10px] select-all font-bold">
                            {id.slice(0, 13)}...
                          </td>

                          {/* API Key */}
                          <td className="py-3.5 px-5 text-slate-400 font-mono text-[10px] select-all">
                            {log.api_key_id || 'unknown'}
                          </td>

                          {/* Latency */}
                          <td className="py-3.5 px-5 text-right font-mono text-[10px] text-slate-300">
                            {log.latency_ms || 0} ms
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-5 text-center select-none">
                            {blocked ? (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide font-sans">
                                Blocked
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide font-sans">
                                Allowed
                              </span>
                            )}
                          </td>

                          {/* Provider & Model */}
                          <td className="py-3.5 px-5 font-mono text-[10px] text-slate-400">
                            <span className="capitalize text-slate-300 font-sans font-semibold mr-1">
                              {log.llm_provider || 'N/A'}
                            </span>
                            ({log.llm_model || 'N/A'})
                          </td>

                          {/* Triggered Guards Badges */}
                          <td className="py-3.5 px-5">
                            <div className="flex flex-wrap gap-1">
                              {guards.length === 0 ? (
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">None</span>
                              ) : (
                                guards.map((g, i) => (
                                  <span
                                    key={i}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider font-mono ${
                                      blocked
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    }`}
                                  >
                                    {g}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Time */}
                          <td className="py-3.5 px-5 text-right text-slate-500 font-medium font-mono text-[10px]">
                            {formatTime(log.timestamp || (log as any).created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Showing counts & Pagination controls */}
              <div className="border-t border-[#17171e]/40 p-4 flex items-center justify-between font-mono text-[9px] select-none bg-black/10">
                <span className="text-slate-500 uppercase tracking-widest font-bold">
                  Showing <strong className="text-slate-300">{logs.length}</strong> of <strong className="text-slate-300">{totalCount.toLocaleString()}</strong> logs
                </span>
                
                {totalPages > 1 && (
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
                )}
              </div>
            </div>
          )}
        </Card>

      </div>

      {/* Slide-out details drawer panel */}
      {drawerOpen && selectedLogDetails && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => { setDrawerOpen(false); setSelectedLogId(null); }}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] z-50 bg-[#0d0d11] border-l border-[#17171e] shadow-2xl flex flex-col justify-between select-none animate-slideIn">
            
            {/* Header */}
            <div className="p-5 border-b border-[#17171e] flex items-center justify-between bg-gradient-to-r from-slate-950 to-[#0d0d11]">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-0.5">Request Audit Panel</h3>
                <h2 className="text-sm font-bold text-white font-mono">{selectedLogDetails.id}</h2>
              </div>
              <div className="flex items-center gap-3">
                {selectedLogDetails.was_blocked || (selectedLogDetails as any).was_blocked ? (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">
                    Blocked
                  </span>
                ) : (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">
                    Allowed
                  </span>
                )}
                <button
                  onClick={() => { setDrawerOpen(false); setSelectedLogId(null); }}
                  className="p-1 rounded bg-[#15151c] hover:bg-[#1f1f2a] border border-[#17171e] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close panel"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Tabs Switcher */}
            <div className="flex border-b border-[#17171e] bg-[#121217]/30 text-xs font-bold text-slate-400">
              <button
                onClick={() => setDrawerTab('input')}
                className={`flex-1 py-3 border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'input' ? 'border-[#ff5a1f] text-white bg-slate-800/10' : 'border-transparent hover:text-slate-300'
                }`}
              >
                Prompts Payload
              </button>
              <button
                onClick={() => setDrawerTab('output')}
                className={`flex-1 py-3 border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'output' ? 'border-[#ff5a1f] text-white bg-slate-800/10' : 'border-transparent hover:text-slate-300'
                }`}
              >
                Model Response
              </button>
              <button
                onClick={() => setDrawerTab('security')}
                className={`flex-1 py-3 border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'security' ? 'border-[#ff5a1f] text-white bg-slate-800/10' : 'border-transparent hover:text-slate-300'
                }`}
              >
                Guardrail Diagnostics
              </button>
            </div>

            {/* Scrolling Content Panel */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 font-sans select-text">
              
              {/* TAB 1: Prompts Payload details */}
              {drawerTab === 'input' && (
                <div className="space-y-4">
                  {/* Original Prompt */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest">
                        Original Client Input
                      </span>
                      <button
                        onClick={() => handleCopyText(selectedLogDetails.original_input || '', 'orig_input')}
                        className="text-[9px] font-bold text-slate-400 hover:text-white bg-[#15151c] border border-[#17171e] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        {isCopiedField === 'orig_input' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 bg-black p-3.5 rounded-lg border border-[#17171e] font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-text">
                      {selectedLogDetails.original_input || 'No payload recorded.'}
                    </pre>
                  </div>

                  {/* Scrubbed Prompt */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest">
                        Scrubbed Prompt Sent to LLM
                      </span>
                      <button
                        onClick={() => handleCopyText(selectedLogDetails.scrubbed_input || '', 'scrub_input')}
                        className="text-[9px] font-bold text-slate-400 hover:text-white bg-[#15151c] border border-[#17171e] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        {isCopiedField === 'scrub_input' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-400 bg-[#080710] p-3.5 rounded-lg border border-[#17171e]/70 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-text">
                      {selectedLogDetails.scrubbed_input || 'No scrubbing parameters triggered.'}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: Model Response details */}
              {drawerTab === 'output' && (
                <div className="space-y-4">
                  {/* Raw LLM Response */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest">
                        Raw LLM Response
                      </span>
                      <button
                        onClick={() => handleCopyText(selectedLogDetails.llm_response || '', 'orig_resp')}
                        className="text-[9px] font-bold text-slate-400 hover:text-white bg-[#15151c] border border-[#17171e] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        {isCopiedField === 'orig_resp' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 bg-black p-3.5 rounded-lg border border-[#17171e] font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-text">
                      {selectedLogDetails.llm_response || 'No model response recorded.'}
                    </pre>
                  </div>

                  {/* Scrubbed Response */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest">
                        Scrubbed Response Returned to Client
                      </span>
                      <button
                        onClick={() => handleCopyText(selectedLogDetails.scrubbed_response || '', 'scrub_resp')}
                        className="text-[9px] font-bold text-slate-400 hover:text-white bg-[#15151c] border border-[#17171e] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        {isCopiedField === 'scrub_resp' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-400 bg-[#080710] p-3.5 rounded-lg border border-[#17171e]/70 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-text">
                      {selectedLogDetails.scrubbed_response || 'No output scrubbing triggered.'}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: Guardrail Diagnostics details */}
              {drawerTab === 'security' && (
                <div className="space-y-5 select-none">
                  
                  {/* Triggered Guards with scores */}
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest block border-b border-[#17171e] pb-1.5">
                      Fired Guardrail Violations
                    </span>
                    {parseGuardsList(selectedLogDetails).length === 0 ? (
                      <div className="text-slate-500 text-xs py-4 text-center font-mono">No security policies violated.</div>
                    ) : (
                      <div className="space-y-2">
                        {parseGuardsList(selectedLogDetails).map((g, i) => (
                          <div key={i} className="bg-[#121217] border border-[#17171e] p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <h4 className="text-xs font-bold text-white capitalize">{g}</h4>
                              <p className="text-[9px] text-slate-500 font-mono mt-0.5">Enforcement Layer Safeguard</p>
                            </div>
                            <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                              Triggered
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Block Reason if blocked */}
                  {(selectedLogDetails.was_blocked || (selectedLogDetails as any).was_blocked) && (
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest block border-b border-[#17171e] pb-1.5">
                        Block Override Reason
                      </span>
                      <div className="bg-red-500/[0.02] border border-red-500/20 p-3.5 rounded-lg text-xs text-red-400 font-mono">
                        {selectedLogDetails.block_reason || 'Administrative guardrail block triggered.'}
                      </div>
                    </div>
                  )}

                  {/* Latency & Providers details */}
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-widest block border-b border-[#17171e] pb-1.5">
                      Gateway Routing Summary
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="bg-[#121217] border border-[#17171e] p-3 rounded-lg">
                        <span className="text-[8px] text-slate-500 block uppercase mb-1">Latency</span>
                        <span className="text-white font-bold">{selectedLogDetails.latency_ms || 0} ms</span>
                      </div>
                      <div className="bg-[#121217] border border-[#17171e] p-3 rounded-lg">
                        <span className="text-[8px] text-slate-500 block uppercase mb-1">LLM Node</span>
                        <span className="text-white font-bold capitalize">{selectedLogDetails.llm_provider || 'N/A'}</span>
                      </div>
                      <div className="bg-[#121217] border border-[#17171e] p-3 rounded-lg col-span-2">
                        <span className="text-[8px] text-slate-500 block uppercase mb-1">LLM Model Target</span>
                        <span className="text-slate-300 font-bold">{selectedLogDetails.llm_model || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#17171e] bg-[#0d0d11] text-[9px] font-mono text-slate-500 select-none flex justify-between">
              <span>DETECTED_TIME: {formatTime(selectedLogDetails.timestamp || (selectedLogDetails as any).created_at)}</span>
              <span>API_KEY: {selectedLogDetails.api_key_id || 'N/A'}</span>
            </div>

          </div>
        </>
      )}
    </MainLayout>
  );
};

export default AuditLog;
