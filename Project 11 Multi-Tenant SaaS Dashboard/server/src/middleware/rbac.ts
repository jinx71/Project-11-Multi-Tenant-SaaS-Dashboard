import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from './auth';
import { fail } from '../utils/response';

export interface TenantRequest extends AuthRequest {
  membership?: { role: Role; workspaceId: string };
}

// Verifies the user belongs to :workspaceId AND holds one of the allowed roles.
// Enforces tenant isolation and RBAC in a single DB lookup.
export const requireRole =
  (...allowed: Role[]) =>
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const workspaceId = req.params.workspaceId;
      if (!workspaceId) return fail(res, 'Workspace ID missing', 400);

      const membership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: { userId: req.userId as string, workspaceId },
        },
      });

      if (!membership) return fail(res, 'Not a member of this workspace', 403);
      if (!allowed.includes(membership.role)) {
        return fail(res, 'Insufficient permissions', 403);
      }

      req.membership = { role: membership.role, workspaceId };
      next();
    } catch (err) {
      next(err);
    }
  };
