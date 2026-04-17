import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../../../errors/AppError";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // If headers were already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  console.error(`❌ [${req.method}] ${req.path} - Error:`, err.message);

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
    return;
  }

  // Handle ZodError directly if it bypasses validation middleware
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: "Falha na validação dos dados",
      details: err.errors,
    });
    return;
  }

  // Generic internal server errors
  const status = err.status || 500;
  const message = status === 500 ? "Erro interno do servidor" : err.message;

  res.status(status).json({
    error: message,
  });
};
