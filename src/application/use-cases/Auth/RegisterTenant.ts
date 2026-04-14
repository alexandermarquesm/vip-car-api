import { Tenant } from "../../../domain/entities/Tenant";
import { User } from "../../../domain/entities/User";
import { ITenantRepository } from "../../repositories/ITenantRepository";
import { IUserRepository } from "../../repositories/IUserRepository";
import bcrypt from "bcryptjs";

export interface RegisterTenantInput {
  tenantName: string;
  document?: string;
  userName: string;
  email: string;
  passwordRaw: string;
}

export class RegisterTenant {
  constructor(
    private tenantRepository: ITenantRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: RegisterTenantInput) {
    // Check if email is already taken
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error("Este e-mail já está em uso.");
    }

    // 1. Create Tenant (defaults to 7 days trial in entity constructor)
    const tenant = new Tenant({
      name: input.tenantName,
      document: input.document,
    });
    const savedTenant = await this.tenantRepository.save(tenant);

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.passwordRaw, salt);

    // 3. Create Admin User for this Tenant
    const user = new User({
      tenantId: savedTenant.id,
      name: input.userName,
      email: input.email,
      passwordHash,
      role: "owner",
    });
    const savedUser = await this.userRepository.save(user);

    return {
      success: true,
      tenantId: savedTenant.id,
      userId: savedUser.id,
    };
  }
}
