export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  OVERVIEW: '/overview',
  THREATS: '/threats',
  AUDIT: '/audit',
  KEYS: '/keys',
  CONFIG: '/config',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
} as const;

export const GUARD_TYPES = {
  PROMPT_INJECTION: 'Prompt Injection',
  PII_LEAK: 'PII Leak',
  TOXICITY: 'Toxicity',
  JALIBREAK: 'Jailbreak',
  CUSTOM_REGEX: 'Custom Regex',
} as const;

export const THREAT_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
