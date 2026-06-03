import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'guardlayer-default-jwt-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Missing authentication token',
      code: 'UNAUTHORIZED_MISSING_TOKEN',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Invalid token format. Use Bearer <token>',
      code: 'UNAUTHORIZED_INVALID_FORMAT',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'UNAUTHORIZED_INVALID_TOKEN',
    });
  }
};
