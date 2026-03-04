import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  return fail(res, 'Internal server error', 500);
};
