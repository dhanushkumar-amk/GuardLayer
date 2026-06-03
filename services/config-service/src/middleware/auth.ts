import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Currently an internal service, authentication checks can be added here in future phases.
  next();
};
