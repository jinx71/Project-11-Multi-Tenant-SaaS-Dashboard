import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ok, fail } from '../utils/response';
import { slugify } from '../utils/slugify';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signToken = (userId: string): string =>
  jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  });

const publicUser = (u: { id: string; email: string; name: string }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, parsed.error.issues[0].message, 422);
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail(res, 'An account with this email already exists', 409);

    const hashed = await bcrypt.hash(password, 10);

    // User + their personal workspace + ADMIN membership, atomically.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, password: hashed },
      });
      const workspace = await tx.workspace.create({
        data: { name: `${name.split(' ')[0]}'s Workspace`, slug: slugify(name) },
      });
      await tx.membership.create({
        data: { userId: created.id, workspaceId: workspace.id, role: 'ADMIN' },
      });
      return created;
    });

    return ok(
      res,
      { token: signToken(user.id), user: publicUser(user) },
      'Account created',
      201
    );
  } catch (err) {
    next(err);
  }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Email and password are required', 422);
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for both failure modes -- never reveal which one was wrong.
    if (!user) return fail(res, 'Invalid email or password', 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return fail(res, 'Invalid email or password', 401);

    return ok(res, { token: signToken(user.id), user: publicUser(user) }, 'Logged in');
  } catch (err) {
    next(err);
  }
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) return fail(res, 'User not found', 404);
    return ok(res, { user });
  } catch (err) {
    next(err);
  }
};
