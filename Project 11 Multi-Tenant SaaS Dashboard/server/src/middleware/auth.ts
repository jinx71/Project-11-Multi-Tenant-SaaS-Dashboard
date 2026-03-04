import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { fail } from '../utils/response';

export interface AuthRequest extends Request {
  userId?: string;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return fail(res, 'Authentication required', 401);
  }
  try {
    const payload = jwt.verify(
      header.split(' ')[1],
      process.env.JWT_SECRET as string
    ) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
};
