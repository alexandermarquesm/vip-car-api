import { IUserRepository } from "../../repositories/IUserRepository";
import { ITenantRepository } from "../../repositories/ITenantRepository";
import jwt from "jsonwebtoken";

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export class VerifyEmail {
  constructor(
    private userRepository: IUserRepository,
    private tenantRepository: ITenantRepository,
    private jwtSecret: string
  ) {}

  async execute({ email, code }: VerifyEmailInput) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    const user = await this.userRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    if (user.isEmailVerified) {
      throw new Error("Este e-mail já está confirmado.");
    }

    if (!user.emailVerificationCode || user.emailVerificationCode !== cleanCode) {
      throw new Error("Código de confirmação incorreto.");
    }

    if (user.emailVerificationExpiresAt && new Date() > user.emailVerificationExpiresAt) {
      throw new Error("Código de confirmação expirado.");
    }

    // Mark as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiresAt = undefined;

    await this.userRepository.save(user);

    // Instant Log in
    const tenant = await this.tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new Error("Empresa (Tenant) não encontrada.");
    }

    const secret = this.jwtSecret;
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
