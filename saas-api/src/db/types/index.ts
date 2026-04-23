import { Request } from 'express';

export interface TenantContext {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  rateLimit: number;
}

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
}

// Extend Express Request to carry tenant + auth context
export interface AuthenticatedRequest extends Request {
  auth: AuthPayload;
  tenant: TenantContext;
}