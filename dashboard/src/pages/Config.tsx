import React, { useState, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { apiKeysApi } from '../lib/api';
import type { ApiKey } from '../types';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

const DEFAULT_CONFIG_STATE = {
  prompt_injection_enabled: true,
  prompt_injection_threshold: 0.70,
  jailbreak_enabled: true,
  jailbreak_threshold: 0.70,
  pii_scrubbing_enabled: true,
  pii_types: [] as string[],
  topic_filter_enabled: false,
  allowed_topics: [] as string[],
  toxicity_enabled: true,
  toxicity_threshold: 0.80,
  max_tokens: 2000,
  hallucination_enabled: false,
  block_on_hallucination: false,
};

const PII_TYPES_LIST = [
  { id: 'email', label: 'Email Address' },
  { id: 'phone', label: 'Phone Number' },
  { id: 'aadhaar', label: 'Aadhaar Card' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'bank_account', label: 'Bank Account' },
  { id: 'api_key', label: 'API Keys' },
];

export const Config: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [configState, setConfigState] = useState(DEFAULT_CONFIG_STATE);
  const [originalConfigState, setOriginalConfigState] = useState(DEFAULT_CONFIG_STATE);

  // Input states
  const [maxTokensEnabled, setMaxTokensEnabled] = useState(true);
  const [newTopic, setNewTopic] = useState('');

  // Sanitize raw data from server
  const sanitizeConfig = (raw: any) => ({
    prompt_injection_enabled: raw.prompt_injection_enabled !== undefined ? !!raw.prompt_injection_enabled : true,
    prompt_injection_threshold: parseFloat(raw.prompt_injection_threshold) || 0.70,
    jailbreak_enabled: raw.jailbreak_enabled !== undefined ? !!raw.jailbreak_enabled : true,
    jailbreak_threshold: parseFloat(raw.jailbreak_threshold) || 0.70,
    pii_scrubbing_enabled: raw.pii_scrubbing_enabled !== undefined ? !!raw.pii_scrubbing_enabled : true,
    pii_types: Array.isArray(raw.pii_types) ? raw.pii_types : [],
    topic_filter_enabled: raw.topic_filter_enabled !== undefined ? !!raw.topic_filter_enabled : false,
    allowed_topics: Array.isArray(raw.allowed_topics) ? raw.allowed_topics : [],
    toxicity_enabled: raw.toxicity_enabled !== undefined ? !!raw.toxicity_enabled : true,
    toxicity_threshold: parseFloat(raw.toxicity_threshold) || 0.80,
    max_tokens: typeof raw.max_tokens === 'number' ? raw.max_tokens : 2000,
    hallucination_enabled: raw.hallucination_enabled !== undefined ? !!raw.hallucination_enabled : false,
    block_on_hallucination: raw.block_on_hallucination !== undefined ? !!raw.block_on_hallucination : false,
  });

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(configState) !== JSON.stringify(originalConfigState);

  // Setup toast notifications auto-dismissal
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load API keys list
  const loadKeys = async () => {
    try {
      const data = await apiKeysApi.getKeys();
      // Only keep active keys for configuration scope
      setKeys(data.filter(k => k.active) || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      showToast('Failed to load API keys list', 'error');
    }
  };

  // Load configuration for the selected scope
  const loadConfig = async (keyId: string) => {
    setConfigLoading(true);
    try {
      const data = await apiKeysApi.getKeyConfig(keyId);
      const sanitized = sanitizeConfig(data);
      setConfigState(sanitized);
      setOriginalConfigState(sanitized);
      setMaxTokensEnabled(sanitized.max_tokens > 0);
    } catch (error: any) {
      console.error('Failed to fetch config:', error);
      if (error?.response?.status === 404 && keyId !== 'default') {
        // If config is not found for an API key, fallback/initialize from global default config
        try {
          const globalData = await apiKeysApi.getKeyConfig('default');
          const initialized = { ...sanitizeConfig(globalData), api_key_id: keyId };
          setConfigState(initialized);
          setOriginalConfigState(initialized);
          setMaxTokensEnabled(initialized.max_tokens > 0);
          showToast('Initialized configuration from default template', 'success');
        } catch (innerErr) {
          console.error(innerErr);
          showToast('Failed to load default configuration template', 'error');
        }
      } else {
        showToast('Failed to load configuration', 'error');
      }
    } finally {
      setConfigLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadKeys();
      await loadConfig('default');
      setLoading(false);
    };
    init();
  }, []);

  // Handle changing selected key scope
  const handleKeyChange = async (keyId: string) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to switch scopes? Your changes will be lost.');
      if (!confirmLeave) return;
    }
    setSelectedKeyId(keyId);
    await loadConfig(keyId);
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...configState,
        // Make sure max_tokens is sent as 0 if disabled
        max_tokens: maxTokensEnabled ? configState.max_tokens : 0,
      };
      const data = await apiKeysApi.updateKeyConfig(selectedKeyId, payload);
      const sanitized = sanitizeConfig(data);
      setConfigState(sanitized);
      setOriginalConfigState(sanitized);
      setMaxTokensEnabled(sanitized.max_tokens > 0);
      showToast('Configuration saved successfully', 'success');
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save configuration changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    setConfigState(originalConfigState);
    setMaxTokensEnabled(originalConfigState.max_tokens > 0);
    showToast('Changes discarded', 'success');
  };

  // Add Allowed Topic
  const handleAddTopic = () => {
    const topic = newTopic.trim().toLowerCase();
    if (!topic) return;
    if (configState.allowed_topics.includes(topic)) {
      showToast('Topic already in allowed list', 'error');
      return;
    }
    setConfigState(prev => ({
      ...prev,
      allowed_topics: [...prev.allowed_topics, topic]
    }));
    setNewTopic('');
  };

  // Remove Allowed Topic
  const handleRemoveTopic = (topic: string) => {
    setConfigState(prev => ({
      ...prev,
      allowed_topics: prev.allowed_topics.filter(t => t !== topic)
    }));
  };

  // Router transitions blocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, hasUnsavedChanges]);

  // Browser tab closing blocker
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Configuration"
        description="Configure Input and Output security filters on API scopes."
      />

      {/* Scope Selector dropdown */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0d0d11] border border-[#17171e] rounded-xl p-4.5 mb-6">
        <div className="space-y-1 w-full md:w-auto">
          <label htmlFor="api-key-selector" className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
            Configuration Scope
          </label>
          <div className="relative">
            <select
              id="api-key-selector"
              value={selectedKeyId}
              onChange={(e) => handleKeyChange(e.target.value)}
              className="w-full md:w-80 bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-[#ff5a1f] appearance-none cursor-pointer pr-10"
            >
              <option value="default">Global Default Configuration</option>
              {keys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.keyPrefix}...)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Active Scope
          </p>
          <p className="text-xs font-bold text-[#ff5a1f] mt-1 font-mono">
            {selectedKeyId === 'default'
              ? 'GLOBAL CONFIG'
              : `API KEY: ${keys.find(k => k.id === selectedKeyId)?.name || selectedKeyId}`}
          </p>
        </div>
      </div>

      {configLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-[#17171e] rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="h-40 bg-[#0d0d11] border border-[#17171e] rounded-xl" />
              <div className="h-40 bg-[#0d0d11] border border-[#17171e] rounded-xl" />
            </div>
            <div className="space-y-6">
              <div className="h-56 bg-[#0d0d11] border border-[#17171e] rounded-xl" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 font-sans pb-28">
          
          {/* INPUT GUARDS SECTION */}
          <section id="input-guards" className="space-y-4">
            <div className="border-b border-[#17171e] pb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a1f]" />
                Input Guards Section
              </h2>
              <p className="text-xs text-slate-500 mt-1">Filters applied to user prompts before forwarding requests to LLM engines.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Prompt Injection */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Prompt Injection Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Blocks inputs designed to hijack or subvert the behavior of base prompts.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfigState(prev => ({ ...prev, prompt_injection_enabled: !prev.prompt_injection_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex justify-between items-center text-[10px] font-mono select-none">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Sensitivity Threshold</span>
                      <span className="text-[#ff5a1f] font-bold">{configState.prompt_injection_threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={configState.prompt_injection_threshold}
                      onChange={(e) => setConfigState(prev => ({ ...prev, prompt_injection_threshold: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
                    />
                  </div>
                )}
              </div>

              {/* Card 2: Jailbreak */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Jailbreak Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Blocks prompt formats that attempt to bypass standard model safety boundaries.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfigState(prev => ({ ...prev, jailbreak_enabled: !prev.jailbreak_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex justify-between items-center text-[10px] font-mono select-none">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Sensitivity Threshold</span>
                      <span className="text-[#ff5a1f] font-bold">{configState.jailbreak_threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={configState.jailbreak_threshold}
                      onChange={(e) => setConfigState(prev => ({ ...prev, jailbreak_threshold: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
                    />
                  </div>
                )}
              </div>

              {/* Card 3: PII Scrubbing */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">PII Scrubbing Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Mask personal identifiable information (PII) before it reaches the external provider.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfigState(prev => ({ ...prev, pii_scrubbing_enabled: !prev.pii_scrubbing_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                      PII Types to Mask
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {PII_TYPES_LIST.map((type) => {
                        const isSelected = configState.pii_types.includes(type.id);
                        return (
                          <label
                            key={type.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none ${
                              isSelected
                                ? 'bg-[#ff5a1f]/5 border-[#ff5a1f]/30 text-white'
                                : 'bg-[#16161f] border-[#232330] text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const list = configState.pii_types.includes(type.id)
                                  ? configState.pii_types.filter(t => t !== type.id)
                                  : [...configState.pii_types, type.id];
                                setConfigState(prev => ({ ...prev, pii_types: list }));
                              }}
                              className="rounded border-[#232330] bg-[#1a1a24] text-[#ff5a1f] focus:ring-0 cursor-pointer h-4 w-4"
                            />
                            <span>{type.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Topic Filter */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Topic Filter Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Restrict allowable inputs to specific verified business contexts.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfigState(prev => ({ ...prev, topic_filter_enabled: !prev.topic_filter_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                      Allowed Topics
                    </span>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. support, coding, medical"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTopic();
                          }
                        }}
                        className="flex-1 bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddTopic}
                      >
                        Add
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 select-none min-h-[30px] items-center">
                      {configState.allowed_topics.length === 0 ? (
                        <span className="text-[10px] text-slate-600 font-mono italic">No restrictions. All topics allowed.</span>
                      ) : (
                        configState.allowed_topics.map((topic) => (
                          <div
                            key={topic}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 text-[#ff5a1f] rounded-lg text-[10px] font-bold font-mono"
                          >
                            <span>{topic}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTopic(topic)}
                              className="text-[#ff5a1f] hover:text-white focus:outline-none cursor-pointer"
                              aria-label={`Remove subject ${topic}`}
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 5: Token Limit */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Token Limit Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Enforce request payload boundaries to optimize billing constraints.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const nextEnabled = !maxTokensEnabled;
                      setMaxTokensEnabled(nextEnabled);
                      setConfigState(prev => ({
                        ...prev,
                        max_tokens: nextEnabled ? (prev.max_tokens || 2000) : 0
                      }));
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      maxTokensEnabled ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        maxTokensEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {maxTokensEnabled && (
                  <div className="animate-fadeIn space-y-1.5">
                    <label htmlFor="max-tokens-field" className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                      Max Tokens
                    </label>
                    <input
                      id="max-tokens-field"
                      type="number"
                      min="1"
                      value={configState.max_tokens === 0 ? '' : configState.max_tokens}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfigState(prev => ({ ...prev, max_tokens: isNaN(val) ? 0 : val }));
                      }}
                      placeholder="Unlimited (0)"
                      className="w-full bg-[#16161f] border border-[#232330] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* OUTPUT GUARDS SECTION */}
          <section id="output-guards" className="space-y-4">
            <div className="border-b border-[#17171e] pb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a1f]" />
                Output Guards Section
              </h2>
              <p className="text-xs text-slate-500 mt-1">Filters applied to response streams returning from the backend LLM engine.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Output PII Scrubbing */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">PII Scrubbing Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Mask personally identifiable data in model completions before sending to client.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfigState(prev => ({ ...prev, pii_scrubbing_enabled: !prev.pii_scrubbing_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                      PII Types to Mask (Synchronized with Input Settings)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {PII_TYPES_LIST.map((type) => {
                        const isSelected = configState.pii_types.includes(type.id);
                        return (
                          <label
                            key={type.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none ${
                              isSelected
                                ? 'bg-[#ff5a1f]/5 border-[#ff5a1f]/30 text-white'
                                : 'bg-[#16161f] border-[#232330] text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const list = configState.pii_types.includes(type.id)
                                  ? configState.pii_types.filter(t => t !== type.id)
                                  : [...configState.pii_types, type.id];
                                setConfigState(prev => ({ ...prev, pii_types: list }));
                              }}
                              className="rounded border-[#232330] bg-[#1a1a24] text-[#ff5a1f] focus:ring-0 cursor-pointer h-4 w-4"
                            />
                            <span>{type.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Toxicity */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Toxicity Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Scans completion text for toxic, hateful, or abusive material.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfigState(prev => ({ ...prev, toxicity_enabled: !prev.toxicity_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex justify-between items-center text-[10px] font-mono select-none">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Sensitivity Threshold</span>
                      <span className="text-[#ff5a1f] font-bold">{configState.toxicity_threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={configState.toxicity_threshold}
                      onChange={(e) => setConfigState(prev => ({ ...prev, toxicity_threshold: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
                    />
                  </div>
                )}
              </div>

              {/* Card 3: Hallucination */}
              <div className="bg-[#0d0d11] border border-[#17171e] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Hallucination Card</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Asserts factual consistency of generated answers against input message context.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfigState(prev => ({ ...prev, hallucination_enabled: !prev.hallucination_enabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configState.hallucination_enabled ? 'bg-[#ff5a1f]' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configState.hallucination_enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {configState.hallucination_enabled && (
                  <div className="space-y-3 animate-fadeIn">
                    <label className="flex items-center gap-3 px-3 py-2.5 bg-[#16161f] border border-[#232330] rounded-lg text-xs font-medium cursor-pointer transition-all select-none text-slate-400 hover:border-slate-800">
                      <input
                        type="checkbox"
                        checked={configState.block_on_hallucination}
                        onChange={() => setConfigState(prev => ({ ...prev, block_on_hallucination: !prev.block_on_hallucination }))}
                        className="rounded border-[#232330] bg-[#1a1a24] text-[#ff5a1f] focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span>Block on Hallucination</span>
                    </label>
                    <p className="text-[9px] text-slate-600 leading-normal">
                      Blocks the response if factual inconsistencies are detected. If unchecked, the incident is only logged as a threat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      )}

      {/* Unsaved changes footer alert bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d11]/95 backdrop-blur-md border-t border-[#17171e] py-4 px-6 md:pl-70 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-[0_-8px_30px_rgb(0,0,0,0.5)] animate-slideUp">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5a1f] animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              You have unsaved changes
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={saving}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Toast Notification Component */}
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

export default Config;
