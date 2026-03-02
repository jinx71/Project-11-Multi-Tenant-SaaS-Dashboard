import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ok, fail } from '../utils/response';
import { PLAN_LIMITS } from '../utils/planLimits';
import { TenantRequest } from '../middleware/rbac';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
});

const roleSchema = z.object({ role: z.nativeEnum(Role) });

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

// GET /api/workspaces/:workspaceId/members  (any role)
export const list = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const members = await prisma.membership.findMany({
      where: { workspaceId: req.params.workspaceId },
      select: memberSelect,
      orderBy: { createdAt: 'asc' },
    });
    return ok(res, { members });
  } catch (err) {
    next(err);
  }
};

// POST /api/workspaces/:workspaceId/members  (ADMIN)
// Demo simplification: adds an existing account by email. Production would
// send a tokenised invite email instead.
export const invite = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'A valid email and role are required', 422);
    const { email, role } = parsed.data;
    const workspaceId = req.params.workspaceId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, _count: { select: { memberships: true } } },
    });
    if (!workspace) return fail(res, 'Workspace not found', 404);

    const { maxMembers } = PLAN_LIMITS[workspace.plan];
    if (workspace._count.memberships >= maxMembers) {
      return fail(
        res,
        `The ${workspace.plan} plan allows up to ${maxMembers} members. Upgrade to add more.`,
        402
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return fail(res, 'No account exists with that email', 404);

    const existing = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (existing) return fail(res, 'That user is already a member', 409);

    const member = await prisma.membership.create({
      data: { userId: user.id, workspaceId, role },
      select: memberSelect,
    });
    return ok(res, { member }, 'Member added', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/workspaces/:workspaceId/members/:memberId  (ADMIN)
export const updateRole = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'A valid role is required', 422);
    const workspaceId = req.params.workspaceId;

    const target = await prisma.membership.findUnique({
      where: { id: req.params.memberId },
    });
    // Tenant isolation on the nested resource: the membership must belong to THIS workspace.
    if (!target || target.workspaceId !== workspaceId) {
      return fail(res, 'Member not found in this workspace', 404);
    }

    if (target.role === 'ADMIN' && parsed.data.role !== 'ADMIN') {
      const adminCount = await prisma.membership.count({
        where: { workspaceId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return fail(res, 'A workspace must keep at least one admin', 409);
      }
    }

    const member = await prisma.membership.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
      select: memberSelect,
    });
    return ok(res, { member }, 'Role updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/workspaces/:workspaceId/members/:memberId  (ADMIN)
export const remove = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.workspaceId;
    const target = await prisma.membership.findUnique({
      where: { id: req.params.memberId },
    });
    if (!target || target.workspaceId !== workspaceId) {
      return fail(res, 'Member not found in this workspace', 404);
    }

    if (target.role === 'ADMIN') {
      const adminCount = await prisma.membership.count({
        where: { workspaceId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return fail(res, 'A workspace must keep at least one admin', 409);
      }
    }

    await prisma.membership.delete({ where: { id: target.id } });
    return ok(res, null, 'Member removed');
  } catch (err) {
    next(err);
  }
};
