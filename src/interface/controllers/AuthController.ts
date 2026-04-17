import { Request, Response } from "express";
import { RegisterTenant } from "../../application/use-cases/Auth/RegisterTenant";
import { LoginUser } from "../../application/use-cases/Auth/LoginUser";
import { AppError } from "../../infrastructure/errors/AppError";

export class AuthController {
  constructor(
    private registerTenant: RegisterTenant,
    private loginUser: LoginUser
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const { tenantName, document, userName, email, passwordRaw } = req.body;
    
    try {
      const result = await this.registerTenant.execute({
        tenantName,
        document,
        userName,
        email,
        passwordRaw,
      });
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes("já está em uso")) {
        throw new AppError(error.message, 409);
      }
      throw error;
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, passwordRaw } = req.body;
      const result = await this.loginUser.execute({ email, passwordRaw });
      res.json(result);
    } catch (error: any) {
      if (error.message.includes("incorretos") || error.message.includes("inativo")) {
        throw new AppError(error.message, 401);
      }
      throw error;
    }
  }
}

