import { Request, Response } from "express";
import { RegisterTenant } from "../../application/use-cases/Auth/RegisterTenant";
import { LoginUser } from "../../application/use-cases/Auth/LoginUser";

export class AuthController {
  constructor(
    private registerTenant: RegisterTenant,
    private loginUser: LoginUser
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { tenantName, document, userName, email, passwordRaw } = req.body;
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
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, passwordRaw } = req.body;
      const result = await this.loginUser.execute({ email, passwordRaw });
      res.json(result);
    } catch (error: any) {
      if (error.message.includes("incorretos") || error.message.includes("inativo")) {
        res.status(401).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }
}
