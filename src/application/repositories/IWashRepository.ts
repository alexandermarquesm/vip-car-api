import { Wash } from "../../domain/entities/Wash";

export interface IWashRepository {
  save(wash: Wash): Promise<Wash>;
  findPendingByPlate(tenantId: string, plate: string): Promise<Wash | null>;
  findById(tenantId: string, id: string): Promise<Wash | null>;
  findWithClientInfo(filter: any, search?: string): Promise<any[]>;
  update(tenantId: string, id: string, updateData: Partial<Wash>): Promise<Wash | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
  findAll?(tenantId: string): Promise<Wash[]>;
}
