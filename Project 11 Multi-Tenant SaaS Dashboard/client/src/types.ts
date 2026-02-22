export type Role = 'ADMIN' | 'USER' | 'VIEWER';
export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  stripeCurrentPeriodEnd: string | null;
  createdAt: string;
  role: Role;
}

export interface Member {
  id: string;
  role: Role;
  createdAt: string;
  user: User;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
