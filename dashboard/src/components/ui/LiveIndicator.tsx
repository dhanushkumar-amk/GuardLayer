import React from 'react';

interface LiveIndicatorProps {
  status: 'connected' | 'reconnecting' | 'disconnected';
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ status }) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0d0d11]/60 border border-[#17171e] rounded-lg font-mono text-[8px] font-bold select-none shadow-sm">
      {status === 'connected' && (
        <>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 uppercase tracking-wider">Live</span>
        </>
      )}
      {status === 'reconnecting' && (
        <>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
          </span>
          <span className="text-slate-400 uppercase tracking-wider">Reconnecting...</span>
        </>
      )}
      {status === 'disconnected' && (
        <>
          <span className="relative flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
          </span>
          <span className="text-rose-500 uppercase tracking-wider">Disconnected</span>
        </>
      )}
    </div>
  );
};

export default LiveIndicator;
