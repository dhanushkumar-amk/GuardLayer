import { useEffect } from 'react';
import { useSSEStore } from '../store/sse.store';

export const useSSE = () => {
  const { status, lastThreatEvent, lastAuditEvent } = useSSEStore();

  useEffect(() => {
    // Start SSE connection on mount
    useSSEStore.getState().connect();
  }, []);

  return {
    status,
    lastThreatEvent,
    lastAuditEvent,
  };
};

export default useSSE;
