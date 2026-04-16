import { IUserRepository } from "../../repositories/IUserRepository";
import { ITenantRepository } from "../../repositories/ITenantRepository";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface LoginUserInput {
  email: string;
  passwordRaw: string;
}

export class LoginUser {
  constructor(
    private userRepository: IUserRepository,
    private tenantRepository: ITenantRepository,
    private jwtSecret: string
  ) {}

  async execute({ email, passwordRaw }: LoginUserInput) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const isMatch = await bcrypt.compare(passwordRaw, user.passwordHash);
    if (!isMatch) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const secret = this.jwtSecret;

    if (user.status !== "active") {
      throw new Error("Usuário inativo.");
    }

    const tenant = await this.tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new Error("Tenant não encontrado.");
    }

    
    const tokenExpiration = tenant.plan === "monthly" ? "30d" : "7d";

    const token = jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      secret,
      { expiresIn: tokenExpiration }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenant: {
          name: tenant.name,
          plan: tenant.plan,
          status: tenant.status,
          subscriptionStatus: tenant.subscriptionStatus,
          trialEndsAt: tenant.trialEndsAt,
        },
      },
    };
  }
}
