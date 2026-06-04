import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { settingsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface ProviderConfig {
  provider: string;
  model: string;
  apiKey: string;
}

export const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [toast, setToast] = useState<Toast | null>(null);

  // Section 1: LLM Providers state
  const [primaryProvider, setPrimaryProvider] = useState<ProviderConfig>({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: '••••••••••••••••',
  });
  const [fallbacks, setFallbacks] = useState<ProviderConfig[]>([]);
  const [isEditingPrimary, setIsEditingPrimary] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersSaving, setProvidersSaving] = useState(false);
  
  // Connection testing state
  const [testingIndex, setTestingIndex] = useState<number | 'primary' | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Section 2: Admin Account state
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Section 3: Danger Zone state
  const [confirmAction, setConfirmAction] = useState<'clear_audits' | 'clear_threats' | 'reset_config' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  // Show Toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load LLM Providers config
  const loadProviders = async () => {
    setProvidersLoading(true);
    try {
      const res = await settingsApi.getProviders();
      if (res) {
        setPrimaryProvider(res.primary || { provider: 'openai', model: 'gpt-3.5-turbo', apiKey: '••••••••••••••••' });
        setFallbacks(res.fallbacks || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load LLM providers configuration', 'error');
    } finally {
      setProvidersLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  // Save LLM Providers
  const handleSaveProviders = async () => {
    setProvidersSaving(true);
    try {
      const payload = {
        primary: primaryProvider,
        fallbacks: fallbacks,
      };
      await settingsApi.saveProviders(payload);
      showToast('LLM providers configuration saved', 'success');
      setIsEditingPrimary(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save LLM providers configuration', 'error');
    } finally {
      setProvidersSaving(false);
    }
  };

  // Test connection for a provider row
  const handleTestConnection = async (target: 'primary' | number) => {
    setTestingIndex(target);
    const row = target === 'primary' ? primaryProvider : fallbacks[target];
    
    // Clear previous results for this row
    setTestResults(prev => {
      const copy = { ...prev };
      delete copy[target.toString()];
      return copy;
    });

    try {
      await settingsApi.testConnection(row.provider, row.model, row.apiKey);
      setTestResults(prev => ({
        ...prev,
        [target.toString()]: { success: true, message: 'Connection successful' },
      }));
      showToast(`${row.provider.toUpperCase()} connection successful`, 'success');
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [target.toString()]: { success: false, message: err.message || 'Connection failed' },
      }));
      showToast(`Connection failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setTestingIndex(null);
    }
  };

  // Fallback operations
  const handleAddFallback = () => {
    if (fallbacks.length >= 3) {
      showToast('Maximum of 3 fallback providers allowed', 'error');
      return;
    }
    setFallbacks(prev => [
      ...prev,
      { provider: 'gemini', model: 'gemini-1.5-flash', apiKey: '' },
    ]);
  };

  const handleRemoveFallback = (index: number) => {
    setFallbacks(prev => prev.filter((_, i) => i !== index));
    // Clear test result for deleted index
    setTestResults(prev => {
      const copy = { ...prev };
      delete copy[index.toString()];
      return copy;
    });
  };

  const handleMoveFallback = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= fallbacks.length) return;
    
    setFallbacks(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[nextIndex];
      copy[nextIndex] = temp;
      return copy;
    });

    // Swap test results too
    setTestResults(prev => {
      const copy = { ...prev };
      const currentRes = copy[index.toString()];
      const nextRes = copy[nextIndex.toString()];
      
      if (currentRes) copy[nextIndex.toString()] = currentRes;
      else delete copy[nextIndex.toString()];

      if (nextRes) copy[index.toString()] = nextRes;
      else delete copy[index.toString()];

      return copy;
    });
  };

  // Save admin credentials
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.newEmail.trim() || !emailForm.password) {
      showToast('Please fill all fields', 'error');
      return;
    }
    setEmailSaving(true);
    try {
      await settingsApi.updateEmail(emailForm.newEmail, emailForm.password);
      showToast('Administrative email updated successfully', 'success');
      setEmailForm({ newEmail: '', password: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to update email', 'error');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('Please fill all fields', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    const strength = getPasswordStrength(passwordForm.newPassword);
    if (strength.score < 2) {
      showToast('Password strength is too weak', 'error');
      return;
    }

    setPasswordSaving(true);
    try {
      await settingsApi.updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      showToast('Password updated successfully', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Danger Zone actions
  const triggerDangerAction = (action: 'clear_audits' | 'clear_threats' | 'reset_config') => {
    setConfirmAction(action);
    setConfirmText('');
  };

  const handleConfirmDanger = async () => {
    if (confirmAction === 'clear_audits' && confirmText !== 'DELETE') return;
    if (confirmAction === 'clear_threats' && confirmText !== 'DELETE') return;

    setDangerLoading(true);
    try {
      if (confirmAction === 'clear_audits') {
        await settingsApi.clearAuditLogs();
        showToast('All audit logs cleared successfully', 'success');
      } else if (confirmAction === 'clear_threats') {
        await settingsApi.clearThreatLogs();
        showToast('All threat logs cleared successfully', 'success');
      } else if (confirmAction === 'reset_config') {
        await settingsApi.resetConfigToDefaults();
        showToast('System configuration reset to default rules', 'success');
      }
      setConfirmAction(null);
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setDangerLoading(false);
    }
  };

  // Password strength checker helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-800 w-0' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    
    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500 w-1/4' };
    if (score === 2) return { score, label: 'Fair', color: 'bg-orange-500 w-2/4' };
    if (score === 3) return { score, label: 'Good', color: 'bg-blue-500 w-3/4' };
    return { score, label: 'Strong', color: 'bg-emerald-500 w-full' };
  };

  const passStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <MainLayout>
      <PageHeader
        title="Settings"
        description="Configure LLM upstream endpoints, manage administrative credentials, or reset log repositories."
      />

      <div className="space-y-8 font-sans pb-16">
        
        {/* SECTION 1: LLM PROVIDERS */}
        <section id="llm-providers">
          <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">LLM Providers</h2>
              <p className="text-xs text-slate-500 mt-1">Configure primary model upstreams and failover paths.</p>
            </div>

            {providersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner size="md" />
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Primary Provider display / form */}
                <div className="bg-[#121217] border border-[#17171e] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">Primary Upstream</span>
                      {!isEditingPrimary ? (
                        <div className="mt-1">
                          <p className="text-xs font-bold text-white font-mono uppercase">
                            {primaryProvider.provider}
                          </p>
                          <p className="text-xs text-[#ff5a1f] mt-0.5 font-mono">{primaryProvider.model}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">Editing Upstream Config</p>
                      )}
                    </div>
                    {!isEditingPrimary && (
                      <Button variant="secondary" size="sm" onClick={() => setIsEditingPrimary(true)}>
                        Edit Upstream
                      </Button>
                    )}
                  </div>

                  {isEditingPrimary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#17171e] animate-fadeIn">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Upstream Provider</label>
                        <select
                          value={primaryProvider.provider}
                          onChange={(e) => setPrimaryProvider(prev => ({ ...prev, provider: e.target.value }))}
                          className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="gemini">Gemini</option>
                          <option value="groq">Groq</option>
                          <option value="openrouter">OpenRouter</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Model Identifier</label>
                        <input
                          type="text"
                          value={primaryProvider.model}
                          onChange={(e) => setPrimaryProvider(prev => ({ ...prev, model: e.target.value }))}
                          className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">API Key Secret</label>
                        <input
                          type="password"
                          value={primaryProvider.apiKey}
                          onChange={(e) => setPrimaryProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder="Secret Key"
                          className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 select-none font-mono text-[10px] font-bold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestConnection('primary')}
                      disabled={testingIndex !== null}
                    >
                      {testingIndex === 'primary' ? 'Testing...' : 'Test Connection'}
                    </Button>
                    {testResults['primary'] && (
                      <span className={testResults['primary'].success ? 'text-emerald-400' : 'text-red-400'}>
                        {testResults['primary'].success ? '✓ SUCCESS' : `✗ FAIL: ${testResults['primary'].message}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Fallbacks header */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Failover Paths</h3>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Order in which calls failover if the primary provider experiences downtime.
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleAddFallback} disabled={fallbacks.length >= 3}>
                      + Add Fallback
                    </Button>
                  </div>

                  {fallbacks.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-[#17171e] rounded-xl text-slate-500 text-xs italic">
                      No fallback providers configured. System will fail immediately on primary provider faults.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fallbacks.map((fallback, index) => (
                        <div key={index} className="bg-[#121217]/50 border border-[#17171e] rounded-xl p-4.5 space-y-3 relative animate-fadeIn">
                          
                          {/* Row controls */}
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            
                            {/* Drag / Sorting arrows */}
                            <div className="flex items-center gap-1.5 self-start select-none">
                              <button
                                onClick={() => handleMoveFallback(index, 'up')}
                                disabled={index === 0}
                                className="h-6 w-6 rounded bg-[#16161f] border border-[#232330] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveFallback(index, 'down')}
                                disabled={index === fallbacks.length - 1}
                                className="h-6 w-6 rounded bg-[#16161f] border border-[#232330] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move Down"
                              >
                                ▼
                              </button>
                              <span className="text-[10px] font-mono font-bold text-slate-500 ml-1">#{index + 1}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                              <select
                                value={fallback.provider}
                                onChange={(e) => {
                                  const copy = [...fallbacks];
                                  copy[index].provider = e.target.value;
                                  setFallbacks(copy);
                                }}
                                className="bg-[#16161f] border border-[#232330] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                              >
                                <option value="openai">OpenAI</option>
                                <option value="gemini">Gemini</option>
                                <option value="groq">Groq</option>
                                <option value="openrouter">OpenRouter</option>
                              </select>

                              <input
                                type="text"
                                value={fallback.model}
                                onChange={(e) => {
                                  const copy = [...fallbacks];
                                  copy[index].model = e.target.value;
                                  setFallbacks(copy);
                                }}
                                placeholder="Model Name"
                                className="bg-[#16161f] border border-[#232330] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                              />

                              <input
                                type="password"
                                value={fallback.apiKey}
                                onChange={(e) => {
                                  const copy = [...fallbacks];
                                  copy[index].apiKey = e.target.value;
                                  setFallbacks(copy);
                                }}
                                placeholder="Secret API Key"
                                className="bg-[#16161f] border border-[#232330] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                              />
                            </div>

                            <button
                              onClick={() => handleRemoveFallback(index)}
                              className="text-rose-500 hover:text-rose-400 focus:outline-none text-[10px] font-mono font-bold self-end md:self-center cursor-pointer pl-2"
                            >
                              REMOVE
                            </button>
                          </div>

                          {/* Row actions */}
                          <div className="flex items-center gap-4 select-none font-mono text-[10px] font-bold">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestConnection(index)}
                              disabled={testingIndex !== null}
                            >
                              {testingIndex === index ? 'Testing...' : 'Test Connection'}
                            </Button>
                            {testResults[index.toString()] && (
                              <span className={testResults[index.toString()].success ? 'text-emerald-400' : 'text-red-400'}>
                                {testResults[index.toString()].success ? '✓ SUCCESS' : `✗ FAIL: ${testResults[index.toString()].message}`}
                              </span>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save button */}
                <div className="pt-2 flex justify-end">
                  <Button variant="primary" size="md" isLoading={providersSaving} onClick={handleSaveProviders}>
                    Save Providers
                  </Button>
                </div>

              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: ADMIN ACCOUNT */}
        <section id="admin-account" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card A: Email */}
          <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Admin Profile</h2>
              <p className="text-xs text-slate-500 mt-1">Configure administrative login credentials.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#121217] border border-[#17171e] rounded-xl p-4.5">
                <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">Current Email</span>
                <p className="text-xs font-bold text-white mt-1 font-mono">{user?.email || 'admin@guardlayer.dev'}</p>
              </div>

              <form onSubmit={handleSaveEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="new-email-field" className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">New Email Address</label>
                  <input
                    id="new-email-field"
                    type="email"
                    required
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                    className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email-password-field" className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Current Password</label>
                  <input
                    id="email-password-field"
                    type="password"
                    required
                    value={emailForm.password}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" size="sm" isLoading={emailSaving}>
                    Update Email
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Card B: Password */}
          <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Change Password</h2>
              <p className="text-xs text-slate-500 mt-1">Reset your dashboard security parameters.</p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="current-pass-field" className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Current Password</label>
                <input
                  id="current-pass-field"
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-pass-field" className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">New Password</label>
                <input
                  id="new-pass-field"
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                />
                
                {/* Password Strength Indicator */}
                {passwordForm.newPassword && (
                  <div className="space-y-1 animate-fadeIn pt-1">
                    <div className="flex justify-between text-[8px] font-mono font-bold uppercase tracking-wider">
                      <span className="text-slate-500">Security Index</span>
                      <span className={passStrength.score >= 3 ? 'text-emerald-400' : passStrength.score === 2 ? 'text-orange-400' : 'text-rose-500'}>
                        {passStrength.label}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${passStrength.color}`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-pass-field" className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Confirm New Password</label>
                <input
                  id="confirm-pass-field"
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="sm" isLoading={passwordSaving}>
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* SECTION 3: DANGER ZONE */}
        <section id="danger-zone">
          <div className="bg-[#0d0d11] border border-rose-500/20 hover:border-rose-500/30 transition-all rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-rose-500 uppercase tracking-wider font-mono">Danger Zone</h2>
              <p className="text-xs text-slate-500 mt-1">Irreversible administrative actions affecting data repositories.</p>
            </div>

            <div className="divide-y divide-[#17171e]/60">
              
              {/* Action 1: Clear Audit Logs */}
              <div className="py-4.5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">Clear Audit Logs</p>
                  <p className="text-[10px] text-slate-500">Permanently empty the request logs history. This cannot be undone.</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => triggerDangerAction('clear_audits')}>
                  Clear Audits
                </Button>
              </div>

              {/* Action 2: Clear Threat Logs */}
              <div className="py-4.5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">Clear Threat Logs</p>
                  <p className="text-[10px] text-slate-500">Permanently wipe all security violations incident records.</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => triggerDangerAction('clear_threats')}>
                  Clear Threats
                </Button>
              </div>

              {/* Action 3: Reset Config */}
              <div className="py-4.5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">Reset System Rules</p>
                  <p className="text-[10px] text-slate-500">Revert all thresholds and active guards settings back to factory rules.</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => triggerDangerAction('reset_config')}>
                  Reset Config
                </Button>
              </div>

            </div>
          </div>
        </section>

      </div>

      {/* CONFIRMATION DANGER DIALOG MODAL */}
      {confirmAction !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans animate-fadeIn">
          <div className="bg-[#0d0d11] border border-[#17171e] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6">
            
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-rose-500 uppercase tracking-wider font-mono flex items-center gap-2">
                ⚠️ SECURITY CHECK REQUIRED
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {confirmAction === 'clear_audits' && 'You are about to permanently delete all API proxy audit logs.'}
                {confirmAction === 'clear_threats' && 'You are about to permanently clear all threat logging registers.'}
                {confirmAction === 'reset_config' && 'You are about to reset all security guard thresholds to defaults.'}
                <span className="block font-bold text-rose-400 mt-2">This action is irreversible.</span>
              </p>
            </div>

            {/* Type to confirm details */}
            {(confirmAction === 'clear_audits' || confirmAction === 'clear_threats') ? (
              <div className="space-y-2.5">
                <label htmlFor="danger-confirm-input" className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Type <span className="text-white font-black">DELETE</span> to confirm action
                </label>
                <input
                  id="danger-confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-[#16161f] border border-rose-500/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono font-black"
                />
              </div>
            ) : (
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider select-none">
                Please click Confirm to overwrite configurations.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={dangerLoading}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={dangerLoading}
                disabled={
                  (confirmAction === 'clear_audits' || confirmAction === 'clear_threats') &&
                  confirmText !== 'DELETE'
                }
                onClick={handleConfirmDanger}
              >
                Confirm Action
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST COMPONENT */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-slideIn ${
          toast.type === 'success'
            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'
            : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'
        }`}>
          {toast.type === 'success' ? (
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-xs font-bold font-mono uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

    </MainLayout>
  );
};

export default Settings;
