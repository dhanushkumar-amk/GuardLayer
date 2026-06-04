import { create } from 'zustand';
import { useAuthStore } from './auth.store';
import { API_BASE_URL } from '../lib/constants';

import { useNotificationsStore } from './notifications.store';

interface SSEState {
  status: 'connected' | 'reconnecting' | 'disconnected';
  lastThreatEvent: any;
  lastAuditEvent: any;
  connect: () => void;
  disconnect: () => void;
}

let eventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;

export const useSSEStore = create<SSEState>((set) => ({
  status: 'disconnected',
  lastThreatEvent: null,
  lastAuditEvent: null,
  connect: () => {
    // Prevent double connection if already connected/connecting
    if (eventSource) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    const run = () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      const url = `${API_BASE_URL}/api/stream/threats?token=${token}`;
      set({ status: retryCount > 0 ? 'reconnecting' : 'disconnected' });

      console.log('Connecting to SSE stream at:', url);
      const es = new EventSource(url);
      eventSource = es;

      es.onopen = () => {
        console.log('SSE connection successfully opened.');
        set({ status: 'connected' });
        retryCount = 0;
      };

      es.onerror = (e) => {
        console.error('SSE Error event received:', e);
        es.close();
        eventSource = null;

        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        set({ status: 'reconnecting' });
        retryCount += 1;

        reconnectTimeout = setTimeout(() => {
          run();
        }, delay);
      };

      es.addEventListener('threat', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const isNotOnThreatsPage = window.location.pathname !== '/threats';
          
          set({ lastThreatEvent: data });
          
          if (isNotOnThreatsPage) {
            useNotificationsStore.getState().setHasNewThreat(true);
          }
        } catch (err) {
          console.error('Failed to parse SSE threat data:', err);
        }
      });

      es.addEventListener('audit', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          set({ lastAuditEvent: data });
        } catch (err) {
          console.error('Failed to parse SSE audit data:', err);
        }
      });
    };

    run();
  },
  disconnect: () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    retryCount = 0;
    set({ status: 'disconnected', lastThreatEvent: null, lastAuditEvent: null });
  }
}));
