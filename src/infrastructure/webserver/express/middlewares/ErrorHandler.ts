import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("❌ Error:", err.message);

  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: "Validação falhou",
      details: err.errors,
    });
    return;
  }

  // Generic errors
  const status = err.status || 500;
  const message = status === 500 ? "Erro interno do servidor" : err.message;

  res.status(status).json({
    error: message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
