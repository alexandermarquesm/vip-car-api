import { Client } from "../../domain/entities/Client";

export interface IClientRepository {
  save(client: Client): Promise<Client>;
  findByPhone(tenantId: string, phone: string): Promise<Client | null>;
  findById(tenantId: string, id: string): Promise<Client | null>;
  findByName(tenantId: string, name: string): Promise<Client[]>;
  search(tenantId: string, query: string): Promise<Client[]>;
  update(tenantId: string, id: string, updateData: Partial<Client>): Promise<Client | null>;
  findAll(tenantId: string): Promise<Client[]>;
  delete(tenantId: string, id: string): Promise<boolean>;
}
