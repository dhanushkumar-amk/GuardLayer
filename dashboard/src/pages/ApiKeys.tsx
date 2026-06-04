import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { apiKeysApi } from '../lib/api';
import type { ApiKey } from '../types';

export const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal for key creation
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [copyingSuccess, setCopyingSuccess] = useState(false);

  // Modal/Confirmation dialog for key revocation
  const [revokeConfirmKey, setRevokeConfirmKey] = useState<ApiKey | null>(null);
  const [revokingLoading, setRevokingLoading] = useState(false);

  // Side Drawer / Panel for key config
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);
  
  // Local config edits state
  const [configState, setConfigState] = useState({
    prompt_injection_enabled: true,
    prompt_injection_threshold: 0.7,
    jailbreak_enabled: true,
    jailbreak_threshold: 0.7,
    pii_scrubbing_enabled: true,
    pii_types: [] as string[],
    topic_filter_enabled: false,
    allowed_topics: [] as string[],
    toxicity_enabled: true,
    toxicity_threshold: 0.8,
    max_tokens: 2000,
  });

  // Topic input state
  const [newTopic, setNewTopic] = useState('');

  // Fetch API keys
  const fetchKeys = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await apiKeysApi.getKeys();
      setKeys(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch API keys. Connection offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Escape key listener to close modals/drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (createModalOpen) {
          if (!creatingLoading) {
            setCreateModalOpen(false);
            setCreatedKey(null);
            setNewKeyName('');
          }
        }
        if (revokeConfirmKey) {
          if (!revokingLoading) setRevokeConfirmKey(null);
        }
        if (configOpen) {
          if (!configSaving) {
            setConfigOpen(false);
            setSelectedKey(null);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createModalOpen, creatingLoading, revokeConfirmKey, revokingLoading, configOpen, configSaving]);

  // Handle API key generation
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreatingLoading(true);
    setError(null);
    try {
      const newKey = await apiKeysApi.createKey(newKeyName.trim());
      setCreatedKey(newKey);
      await fetchKeys(true);
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate key. Please try again.');
    } finally {
      setCreatingLoading(false);
    }
  };

  // Handle key revocation
  const handleRevokeKey = async () => {
    if (!revokeConfirmKey) return;
    setRevokingLoading(true);
    try {
      await apiKeysApi.deleteKey(revokeConfirmKey.id);
      setRevokeConfirmKey(null);
      await fetchKeys(true);
    } catch (err: any) {
      console.error(err);
      alert('Failed to revoke API key.');
    } finally {
      setRevokingLoading(false);
    }
  };

  // Fetch single log detail when selected
  useEffect(() => {
    if (!selectedKey) {
      setConfigOpen(false);
      return;
    }

    const fetchConfig = async () => {
      setConfigLoading(true);
      setConfigSaveSuccess(false);
      try {
        const config = await apiKeysApi.getKeyConfig(selectedKey.id);
        setConfigState({
          prompt_injection_enabled: config.prompt_injection_enabled ?? true,
          prompt_injection_threshold: Number(config.prompt_injection_threshold ?? 0.70),
          jailbreak_enabled: config.jailbreak_enabled ?? true,
          jailbreak_threshold: Number(config.jailbreak_threshold ?? 0.70),
          pii_scrubbing_enabled: config.pii_scrubbing_enabled ?? true,
          pii_types: Array.isArray(config.pii_types) ? config.pii_types : [],
          topic_filter_enabled: config.topic_filter_enabled ?? false,
          allowed_topics: Array.isArray(config.allowed_topics) ? config.allowed_topics : [],
          toxicity_enabled: config.toxicity_enabled ?? true,
          toxicity_threshold: Number(config.toxicity_threshold ?? 0.80),
          max_tokens: Number(config.max_tokens ?? 2000),
        });
        setConfigOpen(true);
      } catch (err) {
        console.error('Failed to load configuration:', err);
        alert('Failed to load configuration settings for this key.');
        setSelectedKey(null);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, [selectedKey]);

  // Handle updating key settings config
  const handleSaveConfig = async () => {
    if (!selectedKey) return;
    setConfigSaving(true);
    setConfigSaveSuccess(false);
    try {
      await apiKeysApi.updateKeyConfig(selectedKey.id, configState);
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save configuration settings:', err);
      alert('Failed to save configuration settings.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Helper to copy strings to clipboard
  const handleCopyKey = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
    setCopyingSuccess(true);
    setTimeout(() => setCopyingSuccess(false), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Never';
    }
  };

  const activeKeysCount = keys.filter((k) => k.active).length;
  
  const filteredKeys = keys.filter((k) => 
    k.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="API Keys Management"
          description="Generate client credentials, inspect connection statuses, and fine-tune security filters for individual integration profiles."
        />
        
        <div className="flex items-center gap-3">
          {/* Active keys count display */}
          <div className="flex items-center gap-2 bg-[#0d0d11]/60 border border-[#17171e]/80 px-3.5 py-2 rounded-lg font-mono text-[10px] select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 font-bold uppercase tracking-wider">{activeKeysCount} Active Keys</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreatedKey(null);
              setNewKeyName('');
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-md active:scale-95 transition-all text-xs"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Key</span>
          </Button>
        </div>
      </div>

      <div className="space-y-6 font-sans">
        
        {/* Custom filters panel */}
        <div className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-4 space-y-3">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search keys by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 placeholder-slate-600 text-xs pl-9 pr-3 py-2 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]/30"
            />
          </div>
        </div>

        {/* API Keys Table Card */}
        <Card className="bg-[#0d0d11]/60 border border-[#17171e]/80 rounded-2xl p-0 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center select-none animate-pulse">
              <div className="w-7 h-7 rounded-full border-2 border-[#ff5a1f] border-t-transparent animate-spin mb-4" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">Loading API Credentials...</span>
            </div>
          ) : configLoading ? (
            <div className="py-24 flex flex-col items-center justify-center select-none">
              <div className="w-7 h-7 rounded-full border-2 border-[#ff5a1f] border-t-transparent animate-spin mb-4" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">Opening Configuration...</span>
            </div>
          ) : error ? (
            <div className="py-20 text-center select-none">
              <svg className="w-12 h-12 text-rose-500/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-sm font-bold text-white mb-1.5">Network Node Failure</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">{error}</p>
              <button onClick={() => fetchKeys()} className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-full hover:bg-rose-500 transition-colors cursor-pointer">
                Retry Connection
              </button>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-24 text-center select-none bg-transparent">
              <div className="w-12 h-12 rounded-full bg-[#121217] border border-[#17171e] flex items-center justify-center text-slate-500 mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No API Keys Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-5">
                Generate your first secure client API key to connect external models and proxy safety channels.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCreatedKey(null);
                  setNewKeyName('');
                  setCreateModalOpen(true);
                }}
                className="px-6 py-2 text-xs font-bold transition-all"
              >
                Create First API Key
              </Button>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="py-20 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-[#121217] border border-[#17171e] flex items-center justify-center text-slate-600 mx-auto mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No Matching API Keys</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                We couldn't find any API keys matching "{search}".
              </p>
            </div>
          ) : (
            <div className="w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-[#17171e]/60 text-slate-500 font-bold uppercase select-none text-[9px] tracking-widest bg-slate-900/10">
                      <th className="py-3.5 px-5">Name</th>
                      <th className="py-3.5 px-5">Key Prefix</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5">Created Date</th>
                      <th className="py-3.5 px-5">Last Used Date</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#17171e]/20">
                    {filteredKeys.map((key) => {
                      const isRevoked = !key.active;
                      return (
                        <tr
                          key={key.id}
                          onClick={() => {
                            setSelectedKey(key);
                          }}
                          className={`group hover:bg-[#121217]/50 active:bg-[#121217]/30 cursor-pointer transition-all duration-200 border-l-2 ${
                            isRevoked
                              ? 'opacity-50 bg-black/10 border-l-transparent text-slate-500'
                              : 'border-l-transparent border-b border-[#17171e]/40'
                          }`}
                        >
                          {/* Name */}
                          <td className={`py-4 px-5 font-sans font-bold text-xs ${isRevoked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            <div className="flex items-center gap-2">
                              <span>{key.name}</span>
                              {!isRevoked && (
                                <svg className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 hover:text-[#ff5a1f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </div>
                          </td>

                          {/* Key Prefix */}
                          <td className="py-4 px-5 font-mono text-[10px] text-slate-400">
                            {key.keyPrefix}...
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5 select-none">
                            {isRevoked ? (
                              <span className="bg-slate-800/40 text-slate-500 border border-slate-800 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide font-sans">
                                Revoked
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide font-sans">
                                Active
                              </span>
                            )}
                          </td>

                          {/* Created Date */}
                          <td className="py-4 px-5 font-mono text-[10px] text-slate-400">
                            {formatDate(key.createdAt)}
                          </td>

                          {/* Last Used Date */}
                          <td className="py-4 px-5 font-mono text-[10px] text-slate-400">
                            {formatDate(key.lastUsedAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <button
                              disabled={isRevoked || revokingLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevokeConfirmKey(key);
                              }}
                              className="px-3.5 py-1.5 text-[10px] font-bold tracking-wide uppercase border rounded-lg transition-all select-none disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed
                                border-red-500/25 text-red-400 hover:text-white hover:bg-red-600 focus:outline-none"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create Key Modal */}
      {createModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!creatingLoading) {
                setCreateModalOpen(false);
                setCreatedKey(null);
                setNewKeyName('');
              }
            }}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl w-full max-w-md shadow-2xl p-6 relative pointer-events-auto animate-fadeIn max-h-[90vh] overflow-y-auto">
              
              {/* Close Button */}
              {!creatingLoading && (
                <button
                  onClick={() => {
                    setCreateModalOpen(false);
                    setCreatedKey(null);
                    setNewKeyName('');
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded bg-[#15151c] border border-[#17171e] hover:bg-[#1f1f2a] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {!createdKey ? (
                /* STATE A: Input key name */
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider font-mono">Create API Key</h3>
                    <p className="text-xs text-slate-400">
                      Specify a unique label to identify this key inside integration logs.
                    </p>
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Key Name / Client Label
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. production-mobile-api"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#121217] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 placeholder-slate-700 text-xs rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]/30"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={creatingLoading}
                      onClick={() => {
                        setCreateModalOpen(false);
                        setNewKeyName('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-[#1a1a24] hover:bg-[#232330] border border-[#232330] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={creatingLoading}
                      className="px-5 py-2 text-xs font-bold"
                    >
                      Generate Key
                    </Button>
                  </div>
                </form>
              ) : (
                /* STATE B: Generated raw key display */
                <div className="space-y-5">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider font-mono">Key Generated Successfully</h3>
                    <p className="text-xs text-slate-400">
                      Copy your security credential now. For security purposes, this value cannot be retrieved later.
                    </p>
                  </div>

                  {/* Warning Box */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex gap-3 text-amber-500 text-xs leading-relaxed font-sans select-none">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <strong className="block font-bold">Security Warning</strong>
                      This key will never be shown again. Store it securely in a password manager or environment configuration file.
                    </div>
                  </div>

                  {/* Copyable Key Display */}
                  <div className="bg-[#121217] border border-[#17171e] p-3.5 rounded-xl flex items-center justify-between gap-4 font-mono">
                    <span className="text-slate-200 text-xs break-all select-all font-bold">
                      {createdKey.key}
                    </span>
                    <button
                      onClick={() => handleCopyKey(createdKey.key || '')}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider font-mono transition-all cursor-pointer ${
                        copyingSuccess
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-[#1a1a24] text-slate-300 hover:text-white border-[#232330] hover:bg-[#232330]'
                      }`}
                    >
                      {copyingSuccess ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setCreateModalOpen(false);
                        setCreatedKey(null);
                        setNewKeyName('');
                      }}
                      className="px-6 py-2 text-xs font-bold text-white bg-[#ff5a1f] hover:bg-[#e24e16] rounded-full transition-colors cursor-pointer shadow-md shadow-orange-500/10 active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* Revocation Confirmation Dialog Modal */}
      {revokeConfirmKey && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!revokingLoading) setRevokeConfirmKey(null);
            }}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl w-full max-w-md shadow-2xl p-6 relative pointer-events-auto animate-fadeIn font-sans select-none">
              
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider font-mono">Revoke API Key</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                Are you sure you want to revoke the key <strong className="text-slate-200">"{revokeConfirmKey.name}"</strong>? 
                This action is permanent and cannot be undone. Integration clients using the prefix <span className="font-mono text-rose-400 font-bold">{revokeConfirmKey.keyPrefix}...</span> will be immediately barred from accessing the gateway.
              </p>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  disabled={revokingLoading}
                  onClick={() => setRevokeConfirmKey(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-[#1a1a24] hover:bg-[#232330] border border-[#232330] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={revokingLoading}
                  onClick={handleRevokeKey}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-full transition-colors cursor-pointer"
                >
                  {revokingLoading && (
                    <Spinner size="sm" color="white" className="mr-1.5" />
                  )}
                  <span>Revoke Key</span>
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Slide-out configuration drawer panel */}
      {configOpen && selectedKey && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!configSaving) {
                setConfigOpen(false);
                setSelectedKey(null);
              }
            }}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] z-50 bg-[#0d0d11] border-l border-[#17171e] shadow-2xl flex flex-col justify-between select-none animate-slideIn">
            
            {/* Header */}
            <div className="p-5 border-b border-[#17171e] flex items-center justify-between bg-gradient-to-r from-slate-950 to-[#0d0d11]">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-0.5">Key Config Settings</h3>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white font-mono">{selectedKey.name}</h2>
                  <span className="text-[10px] text-slate-500 font-mono font-medium">({selectedKey.keyPrefix}...)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedKey.active ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">
                    Active
                  </span>
                ) : (
                  <span className="bg-slate-800/40 text-slate-500 border border-slate-800 px-2.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">
                    Revoked
                  </span>
                )}
                <button
                  disabled={configSaving}
                  onClick={() => { setConfigOpen(false); setSelectedKey(null); }}
                  className="p-1 rounded bg-[#15151c] hover:bg-[#1f1f2a] border border-[#17171e] text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Close panel"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrolling Configuration Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 font-sans select-text">
              
              {/* Success Notification inside drawer */}
              {configSaveSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 select-none animate-fadeIn font-semibold">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Configuration saved successfully. Cache flushed downstream.</span>
                </div>
              )}

              {/* 1. Prompt Injection Shield */}
              <div className="bg-[#121217] border border-[#17171e] rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Prompt Injection Shield</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Detect adversarial inputs or system prompt leaks.
                    </p>
                  </div>
                  <button
                    disabled={!selectedKey.active}
                    onClick={() => setConfigState(prev => ({ ...prev, prompt_injection_enabled: !prev.prompt_injection_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                      configState.prompt_injection_enabled ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configState.prompt_injection_enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {configState.prompt_injection_enabled && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex justify-between items-center text-[10px] font-mono select-none">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Sensitivity Threshold</span>
                      <span className="text-[#ff5a1f] font-bold">{configState.prompt_injection_threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      disabled={!selectedKey.active}
                      value={configState.prompt_injection_threshold}
                      onChange={(e) => setConfigState(prev => ({ ...prev, prompt_injection_threshold: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f] disabled:opacity-40"
                    />
                    <p className="text-[9px] text-slate-600 leading-normal">
                      Lower values trigger more false positives; higher values require strong malicious match evidence.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Jailbreak Shield */}
              <div className="bg-[#121217] border border-[#17171e] rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Jailbreak Guard</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Prevent attempts to bypass model instructions or constraints.
                    </p>
                  </div>
                  <button
                    disabled={!selectedKey.active}
                    onClick={() => setConfigState(prev => ({ ...prev, jailbreak_enabled: !prev.jailbreak_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                      configState.jailbreak_enabled ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configState.jailbreak_enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {configState.jailbreak_enabled && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex justify-between items-center text-[10px] font-mono select-none">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Sensitivity Threshold</span>
                      <span className="text-[#ff5a1f] font-bold">{configState.jailbreak_threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      disabled={!selectedKey.active}
                      value={configState.jailbreak_threshold}
                      onChange={(e) => setConfigState(prev => ({ ...prev, jailbreak_threshold: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f] disabled:opacity-40"
                    />
                    <p className="text-[9px] text-slate-600 leading-normal">
                      Blocks instructions attempting to assume personas or override base prompt configurations.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Toxicity Filter */}
              <div className="bg-[#121217] border border-[#17171e] rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Toxicity Filter</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Block profane, abusive, or hateful language on requests.
                    </p>
                  </div>
                  <button
                    disabled={!selectedKey.active}
                    onClick={() => setConfigState(prev => ({ ...prev, toxicity_enabled: !prev.toxicity_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                      configState.toxicity_enabled ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configState.toxicity_enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {configState.toxicity_enabled && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex justify-between items-center text-[10px] font-mono select-none">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Toxicity Threshold</span>
                      <span className="text-[#ff5a1f] font-bold">{configState.toxicity_threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      disabled={!selectedKey.active}
                      value={configState.toxicity_threshold}
                      onChange={(e) => setConfigState(prev => ({ ...prev, toxicity_threshold: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f] disabled:opacity-40"
                    />
                    <p className="text-[9px] text-slate-600 leading-normal">
                      Blocks requests containing abusive slang, insults, or harassment.
                    </p>
                  </div>
                )}
              </div>

              {/* 4. PII Scrubbing Guard */}
              <div className="bg-[#121217] border border-[#17171e] rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">PII Redaction Guard</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Mask personally identifiable data before forwarding queries.
                    </p>
                  </div>
                  <button
                    disabled={!selectedKey.active}
                    onClick={() => setConfigState(prev => ({ ...prev, pii_scrubbing_enabled: !prev.pii_scrubbing_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                      configState.pii_scrubbing_enabled ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configState.pii_scrubbing_enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {configState.pii_scrubbing_enabled && (
                  <div className="space-y-3 animate-fadeIn">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      PII Types to Redact
                    </span>
                    <div className="flex flex-wrap gap-2 select-none">
                      {['EMAIL', 'PHONE', 'SSN', 'IP_ADDRESS', 'CREDIT_CARD'].map((type) => {
                        const isSelected = configState.pii_types.includes(type);
                        return (
                          <button
                            key={type}
                            disabled={!selectedKey.active}
                            onClick={() => {
                              setConfigState(prev => {
                                const list = prev.pii_types.includes(type)
                                  ? prev.pii_types.filter(t => t !== type)
                                  : [...prev.pii_types, type];
                                return { ...prev, pii_types: list };
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'bg-[#ff5a1f]/10 text-[#ff5a1f] border-[#ff5a1f]/30 shadow-sm'
                                : 'bg-[#1a1a24] text-slate-500 border-[#232330] hover:text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-slate-600 leading-normal">
                      Entities matched by internal regex engines will be replaced with tags (e.g. [EMAIL]).
                    </p>
                  </div>
                )}
              </div>

              {/* 5. Topic Filtering Guard */}
              <div className="bg-[#121217] border border-[#17171e] rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Topic Filtering Shield</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                      Restrict requests to safe corporate or technical subjects.
                    </p>
                  </div>
                  <button
                    disabled={!selectedKey.active}
                    onClick={() => setConfigState(prev => ({ ...prev, topic_filter_enabled: !prev.topic_filter_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                      configState.topic_filter_enabled ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configState.topic_filter_enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {configState.topic_filter_enabled && (
                  <div className="space-y-3.5 animate-fadeIn">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Allowed subjects
                    </span>

                    {/* Topics List */}
                    <div className="flex flex-wrap gap-2 select-none">
                      {configState.allowed_topics.length === 0 ? (
                        <span className="text-[10px] text-slate-600 font-mono italic">No restrictions. All topics allowed.</span>
                      ) : (
                        configState.allowed_topics.map((topic, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-[#17171e] text-slate-300 rounded-lg text-[10px] font-bold font-mono"
                          >
                            <span>{topic}</span>
                            {selectedKey.active && (
                              <button
                                onClick={() => setConfigState(prev => ({
                                  ...prev,
                                  allowed_topics: prev.allowed_topics.filter(t => t !== topic)
                                }))}
                                className="text-slate-500 hover:text-white focus:outline-none cursor-pointer"
                                aria-label={`Remove subject ${topic}`}
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Topic Input */}
                    {selectedKey.active && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add topic (e.g. coding, support)..."
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newTopic.trim()) {
                                setConfigState(prev => {
                                  const val = newTopic.trim().toLowerCase();
                                  if (prev.allowed_topics.includes(val)) return prev;
                                  return { ...prev, allowed_topics: [...prev.allowed_topics, val] };
                                });
                                setNewTopic('');
                              }
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-[#0d0d11] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 placeholder-slate-700 text-xs rounded-lg transition-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newTopic.trim()) {
                              setConfigState(prev => {
                                const val = newTopic.trim().toLowerCase();
                                if (prev.allowed_topics.includes(val)) return prev;
                                return { ...prev, allowed_topics: [...prev.allowed_topics, val] };
                              });
                              setNewTopic('');
                            }
                          }}
                          className="px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-[#15151c] hover:bg-[#1f1f2a] border border-[#17171e] rounded-lg transition-colors cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Parameters (Max Tokens) */}
              <div className="bg-[#121217] border border-[#17171e] rounded-xl p-4.5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Parameters constraints</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    Set operational rate envelopes for output pipelines.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    disabled={!selectedKey.active}
                    value={configState.max_tokens}
                    onChange={(e) => setConfigState(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 2000 }))}
                    className="w-full px-3 py-2 bg-[#0d0d11] border border-[#17171e] hover:border-slate-800 focus:border-[#ff5a1f]/50 text-slate-300 placeholder-slate-700 text-xs rounded-lg transition-all focus:outline-none disabled:opacity-40"
                  />
                  <p className="text-[8px] text-slate-600 leading-normal">
                    Caps LLM completions to restrict service token billing spikes.
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#17171e] bg-[#0d0d11] flex items-center justify-between gap-3">
              <button
                disabled={configSaving}
                onClick={() => { setConfigOpen(false); setSelectedKey(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-[#1a1a24] hover:bg-[#232330] border border-[#232330] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                disabled={configSaving || !selectedKey.active}
                onClick={handleSaveConfig}
                className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-[#ff5a1f] hover:bg-[#e24e16] disabled:opacity-45 disabled:pointer-events-none rounded-full transition-all cursor-pointer shadow-md shadow-orange-500/10 active:scale-95"
              >
                {configSaving && (
                  <Spinner size="sm" color="white" className="mr-1.5" />
                )}
                <span>Save Settings</span>
              </button>
            </div>

          </div>
        </>
      )}
    </MainLayout>
  );
};

export default ApiKeys;
