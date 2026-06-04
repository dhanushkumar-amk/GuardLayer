import axios from 'axios';
import { API_BASE_URL } from './constants';
import { useAuthStore } from '../store/auth.store';
import type {
  User,
  ApiKey,
  AuditLog,
  ThreatLog,
  Config,
  Analytics,
} from '../types';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token from Zustand store
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Clear store and redirect to login if 401 received
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().clearAuth();
      // If we are not already on the login page, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
};

// Threat Log endpoints
export const threatsApi = {
  getThreats: async (): Promise<ThreatLog[]> => {
    const response = await api.get('/api/threats');
    return response.data;
  },
  getRecentThreats: async (): Promise<ThreatLog[]> => {
    const response = await api.get('/api/threats/recent');
    return response.data;
  },
};

// Audit Log endpoints
export const auditApi = {
  getAuditLogs: async (params?: {
    api_key_id?: string;
    was_blocked?: boolean | string;
    from_date?: string;
    to_date?: string;
    llm_provider?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLog[]; pagination: { total: number; page: number; limit: number; pages: number } }> => {
    const response = await api.get('/api/audit', { params });
    return response.data;
  },
  getAuditLogById: async (requestId: string): Promise<AuditLog> => {
    const response = await api.get(`/api/audit/${requestId}`);
    return response.data;
  },
};

// API Key endpoints
export const apiKeysApi = {
  getKeys: async (): Promise<ApiKey[]> => {
    const response = await api.get('/api/keys');
    return response.data;
  },
  createKey: async (name: string, role: string): Promise<ApiKey> => {
    const response = await api.post('/api/keys', { name, role });
    return response.data;
  },
  deleteKey: async (id: string): Promise<void> => {
    await api.delete(`/api/keys/${id}`);
  },
};

// Config endpoints
export const configApi = {
  getConfig: async (): Promise<Config> => {
    const response = await api.get('/api/config');
    return response.data;
  },
  updateConfig: async (config: Partial<Config>): Promise<Config> => {
    const response = await api.put('/api/config', config);
    return response.data;
  },
};

// Analytics endpoints
export const analyticsApi = {
  getAnalytics: async (): Promise<Analytics> => {
    const response = await api.get('/api/analytics');
    return response.data;
  },
  getAnalyticsSummary: async (period?: string): Promise<any> => {
    const response = await api.get('/api/analytics/summary', { params: { period } });
    return response.data;
  },
};

export default api;
