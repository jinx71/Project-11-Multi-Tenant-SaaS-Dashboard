import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ok, fail } from '../utils/response';
import { slugify } from '../utils/slugify';
import { AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/rbac';

const nameSchema = z.object({ name: z.string().min(2).max(60) });

const workspaceSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  stripeCurrentPeriodEnd: true,
  createdAt: true,
} as const;

// GET /api/workspaces -- every workspace the user belongs to, with their role in each
export const listMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.userId },
      include: { workspace: { select: workspaceSelect } },
      orderBy: { createdAt: 'asc' },
    });
    const workspaces = memberships.map((m) => ({ ...m.workspace, role: m.role }));
    return ok(res, { workspaces });
  } catch (err) {
    next(err);
  }
};

// POST /api/workspaces
export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = nameSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Workspace name must be 2-60 characters', 422);

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name: parsed.data.name, slug: slugify(parsed.data.name) },
        select: workspaceSelect,
      });
      await tx.membership.create({
        data: { userId: req.userId as string, workspaceId: ws.id, role: 'ADMIN' },
      });
      return ws;
    });

    return ok(res, { workspace: { ...workspace, role: 'ADMIN' } }, 'Workspace created', 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/workspaces/:workspaceId
export const getOne = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.workspaceId },
      select: {
        ...workspaceSelect,
        _count: { select: { memberships: true, projects: true } },
      },
    });
    if (!workspace) return fail(res, 'Workspace not found', 404);
    return ok(res, { workspace: { ...workspace, role: req.membership?.role } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/workspaces/:workspaceId  (ADMIN)
export const update = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = nameSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Workspace name must be 2-60 characters', 422);

    const workspace = await prisma.workspace.update({
      where: { id: req.params.workspaceId },
      data: { name: parsed.data.name },
      select: workspaceSelect,
    });
    return ok(res, { workspace }, 'Workspace renamed');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/workspaces/:workspaceId  (ADMIN)
export const remove = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.workspace.delete({ where: { id: req.params.workspaceId } });
    return ok(res, null, 'Workspace deleted');
  } catch (err) {
    next(err);
  }
};
