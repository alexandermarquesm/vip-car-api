import { Tenant } from "../../../domain/entities/Tenant";
import { User } from "../../../domain/entities/User";
import { ITenantRepository } from "../../repositories/ITenantRepository";
import { IUserRepository } from "../../repositories/IUserRepository";
import { IEmailService } from "../../protocols/IEmailService";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import InviteModel from "../../../infrastructure/database/mongoose-models/InviteModel";

export interface RegisterTenantInput {
  tenantName?: string;
  document?: string;
  userName: string;
  email: string;
  passwordRaw: string;
  role?: "owner" | "worker";
  inviteCode?: string;
  inviteToken?: string;
}

export class RegisterTenant {
  constructor(
    private tenantRepository: ITenantRepository,
    private userRepository: IUserRepository,
    private emailService: IEmailService
  ) {}

  async execute(input: RegisterTenantInput) {
    // Check if email is already taken
    const cleanEmail = input.email.toLowerCase().trim();
    const existingUser = await this.userRepository.findByEmail(cleanEmail);
    if (existingUser) {
      throw new Error("Este e-mail já está em uso.");
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.passwordRaw, salt);

    // Generate 6-digit OTP code
    const emailVerificationCode = crypto.randomInt(100000, 1000000).toString();
    const emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (input.role === "worker") {
      let linkInvite: any = null;
      let tenant: Tenant | null = null;

      if (input.inviteToken) {
        const cleanToken = input.inviteToken.trim();
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(cleanToken)) {
          throw new Error("Convite inválido ou expirado.");
        }

        const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");
        linkInvite = await InviteModel.findOne({
          tokenHash,
          status: "pending",
          expiresAt: { $gt: new Date() },
        }).select("+tokenHash");

        if (linkInvite) {
          tenant = await this.tenantRepository.findById(linkInvite.tenantId);
        }
      } else if (input.inviteCode) {
        tenant = await this.tenantRepository.findByInviteCode(input.inviteCode);
      }

      if (!tenant) {
        throw new Error("Convite inválido, expirado ou estabelecimento não encontrado.");
      }

      if (linkInvite) {
        const now = new Date();
        const isTrialExpired = tenant.plan === "trial" && tenant.trialEndsAt < now;
        const isSubscriptionInactive =
          tenant.plan === "monthly" &&
          tenant.subscriptionStatus !== "active" &&
          (!tenant.currentPeriodEnd || tenant.currentPeriodEnd < now);

        if (tenant.status !== "active" || isTrialExpired || isSubscriptionInactive) {
          throw new Error("A empresa deste convite não está disponível no momento.");
        }

        const members = await this.userRepository.findAllByTenantId(tenant.id);
        const activeCount = members.filter(member =>
          member.status === "active" || member.status === "inactive"
        ).length;

        if (!tenant.canAddUser(activeCount)) {
          throw new Error("Esta empresa atingiu o limite de usuários do plano atual.");
        }

        const claimedInvite = await InviteModel.findOneAndUpdate(
          {
            _id: linkInvite._id,
            status: "pending",
            expiresAt: { $gt: new Date() },
          },
          {
            $set: {
              status: "accepted",
              usedAt: new Date(),
              email: cleanEmail,
            },
          },
          { new: true },
        );

        if (!claimedInvite) {
          throw new Error("Este convite já foi utilizado ou expirou.");
        }
      }

      // Convites por link foram explicitamente gerados pelo proprietário e
      // dispensam uma segunda aprovação. O e-mail ainda precisa ser confirmado.
      const user = new User({
        tenantId: tenant.id,
        name: input.userName,
        email: input.email,
        passwordHash,
        role: "worker",
        status: linkInvite ? "active" : "pending",
        isEmailVerified: false,
        emailVerificationCode,
        emailVerificationExpiresAt,
      });
      let savedUser: User;
      try {
        savedUser = await this.userRepository.save(user);
      } catch (error) {
        if (linkInvite) {
          await InviteModel.updateOne(
            { _id: linkInvite._id, status: "accepted", email: cleanEmail },
            { $set: { status: "pending" }, $unset: { usedAt: 1, email: 1 } },
          );
        }
        throw error;
      }

      await this.emailService.sendVerificationEmail(cleanEmail, emailVerificationCode);

      return {
        success: true,
        tenantId: tenant.id,
        userId: savedUser.id,
      };
    } else {
      // Owner Flow
      if (!input.tenantName) {
        throw new Error("O nome da empresa é obrigatório para proprietários.");
      }
      // 1. Create Tenant (defaults to 7 days trial in entity constructor)
      const tenant = new Tenant({
        name: input.tenantName,
      });
      const savedTenant = await this.tenantRepository.save(tenant);

      // 3. Create Admin User for this Tenant
      const user = new User({
        tenantId: savedTenant.id,
        name: input.userName,
        email: input.email,
        passwordHash,
        role: "owner",
        status: "active",
        isEmailVerified: false,
        emailVerificationCode,
        emailVerificationExpiresAt,
      });
      const savedUser = await this.userRepository.save(user);

      await this.emailService.sendVerificationEmail(cleanEmail, emailVerificationCode);

      return {
        success: true,
        tenantId: savedTenant.id,
        userId: savedUser.id,
      };
    }
  }
}
