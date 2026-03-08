import { Plan } from '@prisma/client';

interface PlanLimits {
  maxProjects: number;
  maxMembers: number;
}

// Infinity = unlimited. Single source of truth for plan gating across the API.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { maxProjects: 3, maxMembers: 3 },
  PRO: { maxProjects: 50, maxMembers: 15 },
  ENTERPRISE: { maxProjects: Infinity, maxMembers: Infinity },
};
