import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ok, fail } from '../utils/response';
import { PLAN_LIMITS } from '../utils/planLimits';
import { TenantRequest } from '../middleware/rbac';

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

// GET /api/workspaces/:workspaceId/projects  (any role)
export const list = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { workspaceId: req.params.workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, { projects });
  } catch (err) {
    next(err);
  }
};

// POST /api/workspaces/:workspaceId/projects  (ADMIN, USER)
export const create = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Project name must be 2-80 characters', 422);
    const workspaceId = req.params.workspaceId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, _count: { select: { projects: true } } },
    });
    if (!workspace) return fail(res, 'Workspace not found', 404);

    const { maxProjects } = PLAN_LIMITS[workspace.plan];
    if (workspace._count.projects >= maxProjects) {
      return fail(
        res,
        `The ${workspace.plan} plan allows up to ${maxProjects} projects. Upgrade to add more.`,
        402
      );
    }

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        workspaceId,
        createdById: req.userId as string,
      },
    });
    return ok(res, { project }, 'Project created', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/workspaces/:workspaceId/projects/:projectId  (ADMIN, USER)
export const update = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Invalid project fields', 422);

    const target = await prisma.project.findUnique({
      where: { id: req.params.projectId },
    });
    // Tenant isolation: project must belong to the workspace in the URL.
    if (!target || target.workspaceId !== req.params.workspaceId) {
      return fail(res, 'Project not found in this workspace', 404);
    }

    const project = await prisma.project.update({
      where: { id: target.id },
      data: parsed.data,
    });
    return ok(res, { project }, 'Project updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/workspaces/:workspaceId/projects/:projectId  (ADMIN)
export const remove = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const target = await prisma.project.findUnique({
      where: { id: req.params.projectId },
    });
    if (!target || target.workspaceId !== req.params.workspaceId) {
      return fail(res, 'Project not found in this workspace', 404);
    }
    await prisma.project.delete({ where: { id: target.id } });
    return ok(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
};
