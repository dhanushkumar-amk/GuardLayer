import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { apiKeysApi } from '../../lib/api';

export interface ExportFilters {
  from_date: string;
  to_date: string;
  api_key_id: string;
  [key: string]: any;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  active: boolean;
}

interface ExportPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (filters: ExportFilters) => Promise<void>;
  initialFilters: Partial<ExportFilters>;
  showApiKeyFilter?: boolean;
  extraFilters?: React.ReactNode;
}

export const ExportPopover: React.FC<ExportPopoverProps> = ({
  isOpen,
  onClose,
  onDownload,
  initialFilters,
  showApiKeyFilter = true,
  extraFilters,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for popover filters
  const [fromDate, setFromDate] = useState(initialFilters.from_date || '');
  const [toDate, setToDate] = useState(initialFilters.to_date || '');
  const [apiKeyId, setApiKeyId] = useState(initialFilters.api_key_id || '');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Close on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      // Reset success status when opening
      setDownloaded(false);
      
      // Sync with parent's active filters
      setFromDate(initialFilters.from_date || '');
      setToDate(initialFilters.to_date || '');
      setApiKeyId(initialFilters.api_key_id || '');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, initialFilters]);

  // Load API keys if dropdown is visible
  useEffect(() => {
    if (isOpen && showApiKeyFilter) {
      const loadApiKeys = async () => {
        setLoadingKeys(true);
        try {
          const keys = await apiKeysApi.getKeys();
          setApiKeys(keys.filter(k => k.active) || []);
        } catch (error) {
          console.error('Failed to load API keys for export:', error);
        } finally {
          setLoadingKeys(false);
        }
      };
      loadApiKeys();
    }
  }, [isOpen, showApiKeyFilter]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDownloading(true);
    try {
      const filters: ExportFilters = {
        ...initialFilters,
        from_date: fromDate,
        to_date: toDate,
        api_key_id: apiKeyId,
      };
      
      // Call download callback
      await onDownload(filters);
      
      setDownloaded(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Export download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute right-0 mt-2 w-80 bg-[#0d0d11]/95 backdrop-blur-md border border-[#17171e]/85 rounded-2xl shadow-2xl p-4.5 z-50 text-sans animate-fadeIn select-none"
    >
      <div className="border-b border-[#17171e] pb-2 mb-3.5">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
          Export Options
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Select filters to apply to the exported CSV file.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Date Filters */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] font-mono text-slate-500 block mb-1">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-[#121217] border border-[#17171e] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#ff5a1f]/50 cursor-pointer [color-scheme:dark]"
              />
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 block mb-1">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-[#121217] border border-[#17171e] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#ff5a1f]/50 cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* API Key dropdown */}
        {showApiKeyFilter && (
          <div className="space-y-1">
            <label htmlFor="export-api-key" className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 block">
              API Key ID
            </label>
            <div className="relative">
              <select
                id="export-api-key"
                value={apiKeyId}
                onChange={(e) => setApiKeyId(e.target.value)}
                className="w-full bg-[#121217] border border-[#17171e] rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-[#ff5a1f] appearance-none cursor-pointer pr-8"
              >
                <option value="">All API Keys</option>
                {loadingKeys ? (
                  <option disabled>Loading keys...</option>
                ) : (
                  apiKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.keyPrefix}...)
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Extra slot filters */}
        {extraFilters}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <Button
            type="submit"
            variant={downloaded ? 'secondary' : 'primary'}
            className="w-full font-bold text-xs py-2 rounded-lg"
            isLoading={downloading}
            disabled={downloading}
          >
            {downloaded ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Downloaded
              </span>
            ) : (
              'Download CSV'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExportPopover;
