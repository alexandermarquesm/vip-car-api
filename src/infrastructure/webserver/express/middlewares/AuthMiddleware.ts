import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
}

export const createAuthMiddleware = (jwtSecret: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Token não fornecido" });
      return;
    }

    const [, token] = authHeader.split(" ");

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      req.user = {
        id: decoded.id,
        tenantId: decoded.tenantId,
        role: decoded.role,
      };
      
      next();
    } catch (err) {
      res.status(401).json({ error: "Token inválido ou expirado" });
      return;
    }
  };
};
