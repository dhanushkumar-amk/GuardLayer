export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  status: string;
  details?: string;
  ipAddress?: string;
}

export interface ThreatLog {
  id: string;
  timestamp: string;
  requestText: string;
  blocked: boolean;
  rulesTriggered: string[];
  classification: string;
  latencyMs: number;
  clientIp?: string;
}

export interface Config {
  gatewayName: string;
  mode: 'permissive' | 'enforcing';
  rateLimit: number;
  allowedModels: string[];
  rules: Record<string, any>;
}

export interface Analytics {
  totalRequests: number;
  blockedRequests: number;
  averageLatencyMs: number;
  threatsByType: Record<string, number>;
  trafficOverTime: {
    timestamp: string;
    count: number;
    blocked: number;
  }[];
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  checksRun: string[];
  score: number;
}
