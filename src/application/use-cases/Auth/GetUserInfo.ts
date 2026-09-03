import { IUserRepository } from "../../repositories/IUserRepository";
import { ITenantRepository } from "../../repositories/ITenantRepository";
import TenantModel from "../../../infrastructure/database/mongoose-models/TenantModel";

interface GetUserInfoRequest {
  userId: string;
}

export class GetUserInfo {
  constructor(
    private userRepository: IUserRepository,
    private tenantRepository: ITenantRepository
  ) {}

  async execute(request: GetUserInfoRequest) {
    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const tenant = await this.tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new Error("Tenant não encontrado");
    }

    // Persist inviteCode if it was lazily generated
    const doc = await TenantModel.findById(user.tenantId);
    if (doc && !doc.inviteCode) {
      doc.inviteCode = tenant.inviteCode;
      await doc.save();
    }

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt,
        currentPeriodEnd: tenant.currentPeriodEnd,
        creditCardFee: tenant.creditCardFee,
        debitCardFee: tenant.debitCardFee,
        inviteCode: tenant.inviteCode,
        variantId: tenant.variantId,
        billingProvider: tenant.billingProvider ||
          (tenant.externalCustomerId ? "stripe" : tenant.plan === "monthly" ? "courtesy" : undefined),
      }
    };
  }
}
