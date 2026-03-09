import { Response } from 'express';

export const ok = (res: Response, data: unknown, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, data, message });

export const fail = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, data: null, message });
