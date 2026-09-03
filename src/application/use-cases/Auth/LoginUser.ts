import { IUserRepository } from "../../repositories/IUserRepository";
import { ITenantRepository } from "../../repositories/ITenantRepository";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import TenantModel from "../../../infrastructure/database/mongoose-models/TenantModel";

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
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const isMatch = await bcrypt.compare(passwordRaw, user.passwordHash);
    if (!isMatch) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const secret = this.jwtSecret;

    if (user.status === "inactive") {
      throw new Error("Usuário inativo.");
    }

    if (!user.isEmailVerified) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }

    const tenant = await this.tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new Error("Sua conta está corrompida: Empresa (Tenant) não encontrada.");
    }

    // Persist inviteCode if it was lazily generated
    const doc = await TenantModel.findById(user.tenantId);
    if (doc && !doc.inviteCode) {
      doc.inviteCode = tenant.inviteCode;
      await doc.save();
    }

    const tokenExpiration = tenant.plan === "monthly" ? "30d" : "7d";

    const token = jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        tokenVersion: user.tokenVersion,
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
        status: user.status,
        tenant: {
          name: tenant.name,
          plan: tenant.plan,
          status: tenant.status,
          subscriptionStatus: tenant.subscriptionStatus,
          trialEndsAt: tenant.trialEndsAt,
          currentPeriodEnd: tenant.currentPeriodEnd,
          creditCardFee: tenant.creditCardFee,
          debitCardFee: tenant.debitCardFee,
          inviteCode: tenant.inviteCode,
          variantId: tenant.variantId,
          billingProvider: tenant.billingProvider ||
            (tenant.externalCustomerId ? "stripe" : tenant.plan === "monthly" ? "courtesy" : undefined),
        },
      },
    };
  }
}
