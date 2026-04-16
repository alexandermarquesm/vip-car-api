import { Request, Response, NextFunction } from "express";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, url, path } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    /* Request logs disabled for production */
  });

  next();
};
