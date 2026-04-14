import { Tenant } from "../../domain/entities/Tenant";

export interface ITenantRepository {
  findByDocument(document: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
  save(tenant: Tenant): Promise<Tenant>;
}
