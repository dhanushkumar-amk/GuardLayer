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
  key?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  resource?: string;
  status?: string;
  details?: string;
  ipAddress?: string;

  // Real properties returned by the backend and used in pages
  api_key_id?: string;
  request_id?: string;
  original_input?: string;
  scrubbed_input?: string;
  llm_response?: string;
  scrubbed_response?: string;
  input_guards_triggered?: any;
  output_guards_triggered?: any;
  was_blocked?: boolean;
  block_reason?: string | null;
  latency_ms?: number;
  llm_provider?: string;
  llm_model?: string;
  created_at?: string;
}

export interface ThreatLog {
  id: string;
  timestamp: string;
  requestText?: string;
  blocked?: boolean;
  rulesTriggered?: string[];
  classification: string;
  latencyMs?: number;
  clientIp?: string;

  // Real properties returned by the backend and used in pages
  api_key_id?: string;
  request_id?: string;
  threat_type?: string;
  threat_score?: string | number;
  original_input?: string;
  detected_at?: string;
  guard_name?: string;
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
