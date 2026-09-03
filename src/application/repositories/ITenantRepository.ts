import { Tenant } from "../../domain/entities/Tenant";

export interface ITenantRepository {
  findByDocument(document: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
  findByExternalCustomerId(externalCustomerId: string): Promise<Tenant | null>;
  findByGooglePlayPurchaseTokenHash(tokenHash: string): Promise<Tenant | null>;
  findByGooglePlayObfuscatedAccountId(accountId: string): Promise<Tenant | null>;
  findByInviteCode(inviteCode: string): Promise<Tenant | null>;
  save(tenant: Tenant): Promise<Tenant>;
}
