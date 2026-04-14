import { Client, IVehicle } from "../../domain/entities/Client";
import { IClientRepository } from "../repositories/IClientRepository";

export interface UpdateClientInput {
  tenantId: string;
  id: string;
  name: string;
  phone: string;
  vehicles?: IVehicle[];
}

export class UpdateClient {
  constructor(private clientRepository: IClientRepository) {}

  async execute({ tenantId, id, name, phone, vehicles }: UpdateClientInput) {
    const updateData: Partial<Client> = { name, phone };
    if (vehicles && Array.isArray(vehicles)) {
      updateData.vehicles = vehicles
        .map((v) => ({
          plate: v.plate ? v.plate.trim().toUpperCase() : "",
          carModel: v.carModel || "",
        }))
        .filter((v) => v.plate !== "");
    }

    const client = await this.clientRepository.update(tenantId, id, updateData);
    if (!client) {
      throw new Error("Cliente não encontrado");
    }

    return client;
  }
}
